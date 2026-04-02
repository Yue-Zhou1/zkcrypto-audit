import json
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BUILD_INDEX = REPO_ROOT / "plugins" / "zkbugs-index" / "scripts" / "build_index.py"
CONTRIBUTE_BUG = REPO_ROOT / "plugins" / "zkbugs-index" / "scripts" / "contribute_bug.py"


def run_cli(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["python3", *args],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"command failed: {' '.join(args)}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )
    return result


class ZkbugsIndexCliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = tempfile.TemporaryDirectory(prefix="zkbugs-index-tests-")
        self.base = Path(self.tmpdir.name)
        self.upstream_dir = self.base / "upstream"
        self.org_dir = self.base / "org-findings"
        self.index_dir = self.base / "index"
        self.upstream_dir.mkdir()
        self.org_dir.mkdir()
        self.config_path = self.base / "config.json"

        self._write_upstream_fixture()
        self._write_config(org_local_path=self.org_dir)

    def tearDown(self) -> None:
        self.tmpdir.cleanup()

    def _write_upstream_fixture(self) -> None:
        fixture = {
            "bug1": {
                "Id": "example/circom/underconstrained",
                "DSL": "circom",
                "Vulnerability": "missing constraint",
                "Impact": "Soundness",
                "Root Cause": "signal assigned but not constrained",
                "Location": "circuits/example.circom",
                "Reproduced": True,
                "Source": "https://example.test/upstream",
            }
        }
        (self.upstream_dir / "sample.json").write_text(json.dumps(fixture, indent=2))

    def _write_config(
        self,
        *,
        org_local_path: Path | None,
        supplemental_files: list[Path] | None = None,
    ) -> None:
        config = {
            "upstream": {
                "repo_url": None,
                "local_path": str(self.upstream_dir),
                "branch": "main",
                "entry_glob": "**/*.json",
                "exclude_paths": [],
            },
            "org": {
                "repo_url": None,
                "local_path": str(org_local_path) if org_local_path else None,
                "branch": "main",
            },
            "supplemental_files": [str(path) for path in (supplemental_files or [])],
            "index_dir": str(self.index_dir),
            "cache_dir": str(self.base / ".cache"),
            "semantic_search": {
                "enabled": False,
                "model": "all-MiniLM-L6-v2",
            },
        }
        self.config_path.write_text(json.dumps(config, indent=2))

    def _write_supplemental_fixture(self, filename: str, entries: list[dict]) -> Path:
        path = self.base / filename
        path.write_text(json.dumps(entries, indent=2))
        return path

    def _build_index(self) -> subprocess.CompletedProcess[str]:
        return run_cli(
            str(BUILD_INDEX),
            "--config",
            str(self.config_path),
            "--rebuild",
        )

    def _create_local_finding(self) -> subprocess.CompletedProcess[str]:
        return run_cli(
            str(CONTRIBUTE_BUG),
            "--config",
            str(self.config_path),
            "--index-dir",
            str(self.index_dir),
            "--dsl",
            "circom",
            "--vuln",
            "under_constrained",
            "--impact",
            "Soundness",
            "--severity",
            "High",
            "--root-cause",
            "local finding root cause",
            "--repo",
            "https://private.example/project",
            "--file",
            "circuits/private.circom",
            "--line",
            "42",
            "--engagement",
            "client-project",
            "--notes",
            "private notes",
        )

    def _promote(self, entry_id: str, state: str, *extra: str) -> subprocess.CompletedProcess[str]:
        return run_cli(
            str(CONTRIBUTE_BUG),
            "--config",
            str(self.config_path),
            "--index-dir",
            str(self.index_dir),
            "--id",
            entry_id,
            "--promote",
            state,
            *extra,
        )

    def test_build_index_loads_org_repo_findings(self) -> None:
        org_entry = {
            "id": "org/circom/demo/already-reported",
            "dsl": "circom",
            "vuln_type": "under_constrained",
            "impact": "Soundness",
            "severity": "High",
            "root_cause": "org repo finding",
            "location": {
                "repo": "https://example.test/org-project",
                "commit": "abc123",
                "file": "circuits/demo.circom",
                "line": 7,
            },
            "reproduced": False,
            "poc_available": False,
            "fix_commit": None,
            "disclosure_state": "reported",
            "found_by": "manual",
            "source": "org",
            "upstream": False,
            "added_at": "2026-03-30T00:00:00+00:00",
        }
        org_findings_dir = self.org_dir / "findings" / "circom" / "demo"
        org_findings_dir.mkdir(parents=True)
        (org_findings_dir / "already-reported.json").write_text(json.dumps(org_entry, indent=2))

        self._build_index()

        shard_path = self.index_dir / "by_dsl" / "circom.json"
        self.assertTrue(shard_path.exists())
        entries = json.loads(shard_path.read_text())
        org_entries = [e for e in entries if e.get("source") == "org"]
        self.assertEqual([e["id"] for e in org_entries], ["org/circom/demo/already-reported"])

    def test_promote_reported_moves_entry_to_org_repo_and_rewrites_id(self) -> None:
        self._create_local_finding()

        promote = self._promote(
            "local/circom/client-project/local-finding-root-cause",
            "reported",
        )

        self.assertIn("org/circom/client-project/local-finding-root-cause", promote.stdout)

        local_findings_path = self.index_dir / "local_findings" / "findings.json"
        local_findings = json.loads(local_findings_path.read_text())
        self.assertEqual(local_findings, [])

        org_entry_path = (
            self.org_dir
            / "findings"
            / "circom"
            / "client-project"
            / "local-finding-root-cause.json"
        )
        self.assertTrue(org_entry_path.exists())

        org_entry = json.loads(org_entry_path.read_text())
        self.assertEqual(org_entry["id"], "org/circom/client-project/local-finding-root-cause")
        self.assertEqual(org_entry["disclosure_state"], "reported")

    def test_disclose_redacts_private_repo_unless_explicitly_marked_public(self) -> None:
        self._create_local_finding()
        self._promote("local/circom/client-project/local-finding-root-cause", "reported")
        self._promote(
            "org/circom/client-project/local-finding-root-cause",
            "fixed",
            "--fix-commit",
            "def456",
        )
        self._promote(
            "org/circom/client-project/local-finding-root-cause",
            "disclosed",
            "--disclose",
            "--public-notes",
            "public summary",
        )

        org_entry_path = (
            self.org_dir
            / "findings"
            / "circom"
            / "client-project"
            / "local-finding-root-cause.json"
        )
        org_entry = json.loads(org_entry_path.read_text())
        self.assertEqual(org_entry["disclosure_state"], "disclosed")
        self.assertNotIn("engagement", org_entry)
        self.assertNotIn("notes", org_entry)
        self.assertEqual(org_entry["public_notes"], "public summary")
        self.assertEqual(org_entry["location"]["file"], "circuits/private.circom")
        self.assertNotIn("repo", org_entry["location"])

    def test_help_output_has_no_empty_subparser_placeholder(self) -> None:
        help_result = run_cli(str(CONTRIBUTE_BUG), "--help")
        self.assertNotIn("{}", help_result.stdout)

    def test_invalid_state_transition_is_rejected(self) -> None:
        self._create_local_finding()

        invalid = run_cli(
            str(CONTRIBUTE_BUG),
            "--config",
            str(self.config_path),
            "--index-dir",
            str(self.index_dir),
            "--id",
            "local/circom/client-project/local-finding-root-cause",
            "--promote",
            "disclosed",
            check=False,
        )
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn("Cannot transition from", invalid.stderr)

    def test_build_index_skips_malformed_upstream_json(self) -> None:
        (self.upstream_dir / "malformed.json").write_text("{")
        build = self._build_index()
        self.assertEqual(build.returncode, 0)

        shard_path = self.index_dir / "by_dsl" / "circom.json"
        self.assertTrue(shard_path.exists())
        entries = json.loads(shard_path.read_text())
        upstream_entries = [e for e in entries if e.get("upstream", False)]
        self.assertEqual([e["id"] for e in upstream_entries], ["zkbugs/example/circom/underconstrained"])

    def test_build_index_loads_supplemental_findings_files(self) -> None:
        supplemental = self._write_supplemental_fixture(
            "supplemental-findings.json",
            [
                {
                    "id": "external/noir/tob/nonce-reuse",
                    "dsl": "noir",
                    "vuln_type": "nonce_reuse",
                    "impact": "Soundness",
                    "severity": "High",
                    "root_cause": "nonce reused in witness signing flow",
                    "location": {
                        "repo": "https://github.com/trailofbits/public-findings",
                        "commit": None,
                        "file": "noir/prover.nr",
                        "line": 88,
                    },
                    "reproduced": False,
                    "poc_available": False,
                    "fix_commit": None,
                    "disclosure_state": "disclosed",
                    "source": "trail-of-bits",
                    "upstream": False,
                    "added_at": "2026-04-02T00:00:00+00:00",
                }
            ],
        )
        self._write_config(org_local_path=self.org_dir, supplemental_files=[supplemental])

        self._build_index()

        shard_path = self.index_dir / "by_vuln_type" / "nonce_reuse.json"
        self.assertTrue(shard_path.exists())
        entries = json.loads(shard_path.read_text())
        entry = next(e for e in entries if e["id"] == "external/noir/tob/nonce-reuse")
        self.assertEqual(entry["source"], "trail-of-bits")
        self.assertFalse(entry["upstream"])

    def test_build_index_skips_malformed_supplemental_file_without_aborting(self) -> None:
        good_supplemental = self._write_supplemental_fixture(
            "supplemental-good.json",
            [
                {
                    "id": "external/halo2/contest/missing-range-check",
                    "dsl": "halo2",
                    "vuln_type": "missing_range_check",
                    "impact": "Soundness",
                    "severity": "High",
                    "root_cause": "lookup gate omitted range bound",
                    "location": {
                        "repo": "https://github.com/example/contest-findings",
                        "commit": None,
                        "file": "halo2/range.rs",
                        "line": 31,
                    },
                    "reproduced": False,
                    "poc_available": False,
                    "fix_commit": None,
                    "disclosure_state": "disclosed",
                    "source": "audit-contests",
                    "upstream": False,
                    "added_at": "2026-04-02T00:00:00+00:00",
                }
            ],
        )
        bad_supplemental = self.base / "supplemental-bad.json"
        bad_supplemental.write_text("{")
        self._write_config(
            org_local_path=self.org_dir,
            supplemental_files=[good_supplemental, bad_supplemental],
        )

        build = self._build_index()

        self.assertEqual(build.returncode, 0)
        self.assertIn("supplemental", build.stderr.lower())
        self.assertIn("Skipping", build.stderr)

        shard_path = self.index_dir / "by_vuln_type" / "missing_range_check.json"
        self.assertTrue(shard_path.exists())
        entries = json.loads(shard_path.read_text())
        self.assertIn("external/halo2/contest/missing-range-check", {e["id"] for e in entries})


if __name__ == "__main__":
    unittest.main()
