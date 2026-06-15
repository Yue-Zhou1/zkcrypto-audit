import json
import tempfile
import unittest
from pathlib import Path

from emu.models.session import PatchOperation, PatchRequest
from emu.services.session_store import (
    FindingConflictError,
    PatchIndexError,
    PathGuardError,
    SessionStore,
    WriteConflictError,
)


def _write_session(path: Path, payload: dict) -> int:
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return path.stat().st_mtime_ns


class SessionStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temp_dir = tempfile.TemporaryDirectory()
        self.repo_root = Path(self._temp_dir.name)

    def tearDown(self) -> None:
        self._temp_dir.cleanup()

    def _store_with_session(self, payload: dict) -> tuple[SessionStore, int]:
        session_path = self.repo_root / "zk-findings" / "sessions" / "eng" / "eng.json"
        base_mtime_ns = _write_session(session_path, payload)
        return SessionStore(self.repo_root), base_mtime_ns

    def test_rejects_path_traversal(self) -> None:
        store = SessionStore(self.repo_root)

        with self.assertRaises(PathGuardError):
            store.patch_session("../outside.json", PatchRequest(base_mtime_ns=0, operations=[]))

    def test_rejects_non_session_artifact_inside_sessions_tree(self) -> None:
        report_path = self.repo_root / "zk-findings" / "sessions" / "eng" / "reports" / "report.json"
        base_mtime_ns = _write_session(report_path, {"engagement_id": "eng"})
        store = SessionStore(self.repo_root)

        with self.assertRaises(PathGuardError):
            store.patch_session(
                "eng/reports/report.json",
                PatchRequest(base_mtime_ns=base_mtime_ns, operations=[]),
            )

    def test_preserves_unknown_fields_when_patching_finding_status(self) -> None:
        session_path = self.repo_root / "zk-findings" / "sessions" / "eng" / "eng.json"
        base_mtime_ns = _write_session(
            session_path,
            {
                "engagement_id": "eng",
                "targets": [],
                "trust_boundaries": [],
                "open_findings": [
                    {
                        "id": "F-01",
                        "status": "unverified",
                        "summary": "Missing subgroup check.",
                        "owner_skill": "ecc-pairing-auditor",
                        "extra": "keep",
                    }
                ],
                "verified_findings": [],
                "next_steps": [],
                "phase": "domain",
                "unknown": {"nested": True},
            },
        )
        store = SessionStore(self.repo_root)

        store.patch_session(
            "eng/eng.json",
            PatchRequest(
                base_mtime_ns=base_mtime_ns,
                operations=[
                    PatchOperation(
                        kind="update_finding_status",
                        finding_id="F-01",
                        status="verified",
                    )
                ],
            ),
        )

        data = json.loads(session_path.read_text())
        self.assertEqual(data["unknown"], {"nested": True})
        self.assertEqual(data["open_findings"][0]["extra"], "keep")
        self.assertEqual(data["open_findings"][0]["status"], "verified")

    def test_patch_bumps_updated_at_and_leaves_no_temp_file(self) -> None:
        session_path = self.repo_root / "zk-findings" / "sessions" / "eng" / "eng.json"
        base_mtime_ns = _write_session(
            session_path,
            {
                "engagement_id": "eng",
                "targets": [],
                "trust_boundaries": [],
                "open_findings": [],
                "verified_findings": [],
                "next_steps": [],
                "updated_at": "2020-01-01T00:00:00Z",
            },
        )
        store = SessionStore(self.repo_root)

        store.patch_session(
            "eng/eng.json",
            PatchRequest(
                base_mtime_ns=base_mtime_ns,
                operations=[PatchOperation(kind="append_next_step", text="step")],
            ),
        )

        data = json.loads(session_path.read_text())
        self.assertNotEqual(data["updated_at"], "2020-01-01T00:00:00Z")
        self.assertEqual(data["next_steps"], ["step"])
        leftovers = [p.name for p in session_path.parent.iterdir() if p.name != "eng.json"]
        self.assertEqual(leftovers, [])

    def test_detects_write_conflict(self) -> None:
        session_path = self.repo_root / "zk-findings" / "sessions" / "eng" / "eng.json"
        stale_mtime_ns = _write_session(
            session_path,
            {
                "engagement_id": "eng",
                "targets": [],
                "trust_boundaries": [],
                "open_findings": [
                    {
                        "id": "F-01",
                        "status": "unverified",
                        "summary": "Missing subgroup check.",
                    }
                ],
                "verified_findings": [],
                "next_steps": [],
            },
        )
        session_path.write_text(session_path.read_text() + "\n")
        store = SessionStore(self.repo_root)

        with self.assertRaises(WriteConflictError):
            store.patch_session(
                "eng/eng.json",
                PatchRequest(
                    base_mtime_ns=stale_mtime_ns,
                    operations=[
                        PatchOperation(
                            kind="update_finding_status",
                            finding_id="F-01",
                            status="verified",
                        )
                    ],
                ),
            )

    def test_edit_target_raises_on_out_of_range_index(self) -> None:
        store, mtime = self._store_with_session(
            {
                "engagement_id": "eng",
                "targets": ["/a"],
                "trust_boundaries": [],
                "open_findings": [],
                "verified_findings": [],
                "next_steps": [],
            }
        )
        with self.assertRaises(PatchIndexError):
            store.patch_session(
                "eng/eng.json",
                PatchRequest(
                    base_mtime_ns=mtime,
                    operations=[PatchOperation(kind="edit_target", index=5, value="/b")],
                ),
            )

    def test_remove_trust_boundary_raises_on_out_of_range_index(self) -> None:
        store, mtime = self._store_with_session(
            {
                "engagement_id": "eng",
                "targets": [],
                "trust_boundaries": [],
                "open_findings": [],
                "verified_findings": [],
                "next_steps": [],
            }
        )
        with self.assertRaises(PatchIndexError):
            store.patch_session(
                "eng/eng.json",
                PatchRequest(
                    base_mtime_ns=mtime,
                    operations=[PatchOperation(kind="remove_trust_boundary", index=0)],
                ),
            )

    def test_add_finding_raises_on_duplicate_id(self) -> None:
        store, mtime = self._store_with_session(
            {
                "engagement_id": "eng",
                "targets": [],
                "trust_boundaries": [],
                "open_findings": [{"id": "F-01", "status": "unverified", "summary": "x"}],
                "verified_findings": [],
                "next_steps": [],
            }
        )
        with self.assertRaises(FindingConflictError):
            store.patch_session(
                "eng/eng.json",
                PatchRequest(
                    base_mtime_ns=mtime,
                    operations=[
                        PatchOperation(
                            kind="add_finding",
                            finding={"id": "F-01", "status": "unverified", "summary": "dupe"},
                        )
                    ],
                ),
            )


if __name__ == "__main__":
    unittest.main()
