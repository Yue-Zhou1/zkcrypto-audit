import json
import os
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


class CryptoAuditPluginScaffoldingTests(unittest.TestCase):
    def test_repo_has_pre_push_hook_for_local_guardrails(self) -> None:
        hook_path = REPO_ROOT / ".githooks" / "pre-push"
        self.assertTrue(hook_path.exists())
        self.assertTrue(os.access(hook_path, os.X_OK), hook_path.as_posix())

        hook_text = hook_path.read_text()
        self.assertIn("python3 -m unittest discover -s tests -q", hook_text)
        self.assertIn("python3 -m py_compile", hook_text)
        self.assertIn(".claude/settings.local.json", hook_text)

    def test_repo_has_ci_and_release_workflows(self) -> None:
        ci_path = REPO_ROOT / ".github" / "workflows" / "ci.yml"
        release_path = REPO_ROOT / ".github" / "workflows" / "release.yml"

        self.assertTrue(ci_path.exists())
        self.assertTrue(release_path.exists())

        ci_text = ci_path.read_text()
        self.assertIn("python-version", ci_text)
        self.assertIn("3.10", ci_text)
        self.assertIn("3.11", ci_text)
        self.assertIn("3.12", ci_text)
        self.assertIn("python3 -m unittest discover -s tests -q", ci_text)
        self.assertIn("python3 -m py_compile", ci_text)
        self.assertIn(".claude/settings.local.json", ci_text)

        release_text = release_path.read_text()
        self.assertIn("tags:", release_text)
        self.assertIn("v*", release_text)
        self.assertIn("workflow_dispatch:", release_text)
        self.assertIn("inputs:", release_text)
        self.assertIn("version:", release_text)
        self.assertIn("release_notes:", release_text)
        self.assertIn("--draft", release_text)
        self.assertIn("--notes", release_text)
        self.assertIn("CHANGELOG.md", release_text)
        self.assertIn("--notes-file", release_text)
        self.assertIn("Missing changelog entry", release_text)
        self.assertIn("gh release create", release_text)
        self.assertIn("python3 -m unittest discover -s tests -q", release_text)

    def test_reviewed_skills_define_rationalizations_to_reject(self) -> None:
        expectations = {
            REPO_ROOT
            / "plugins"
            / "crypto-audit-context"
            / "skills"
            / "crypto-audit-context"
            / "SKILL.md": [
                "## Rationalizations to Reject",
                "The README explains the architecture",
                "I'll map trust boundaries later during domain review",
                "The codebase is small, I can hold the context in my head",
            ],
            REPO_ROOT
            / "plugins"
            / "spec-delta-checker"
            / "skills"
            / "spec-delta-checker"
            / "SKILL.md": [
                "## Rationalizations to Reject",
                "The deviation is just a performance optimization",
                "The paper doesn't apply to this implementation",
                "The spec is ambiguous here",
            ],
            REPO_ROOT
            / "plugins"
            / "crypto-audit-router"
            / "skills"
            / "crypto-audit-router"
            / "SKILL.md": [
                "## Rationalizations to Reject",
                "No ZK code, skip zk-circuit-auditor",
                "It's just Rust safety, no crypto-specific review needed",
                "We already ran spec-delta-checker, skip domain audit",
            ],
        }

        for skill_path, snippets in expectations.items():
            text = skill_path.read_text()
            for snippet in snippets:
                self.assertIn(snippet, text, skill_path.as_posix())

    def test_skills_that_require_bash_allow_tool_execution(self) -> None:
        skills = [
            REPO_ROOT / "plugins" / "ecc-pairing-auditor" / "skills" / "ecc-pairing-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "zk-circuit-auditor" / "skills" / "zk-circuit-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "dkg-threshold-auditor" / "skills" / "dkg-threshold-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "rust-crypto-safety" / "skills" / "rust-crypto-safety" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-fp-check" / "skills" / "crypto-fp-check" / "SKILL.md",
            REPO_ROOT / "plugins" / "zkbugs-index" / "skills" / "zkbugs-index" / "SKILL.md",
        ]

        for skill_path in skills:
            text = skill_path.read_text()
            self.assertIn("allowed-tools:", text, skill_path.as_posix())
            self.assertIn("- Bash", text, skill_path.as_posix())

    def test_readme_documents_collection_installation(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        self.assertIn("## Installation", readme_text)
        self.assertIn("plugin collection", readme_text.lower())
        self.assertIn("crypto-audit-router", readme_text)
        self.assertIn("plugins/", readme_text)
        self.assertIn(".claude-plugin/marketplace.json", readme_text)

    def test_readme_documents_python_runtime_requirement(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        self.assertIn("Python 3.10+", readme_text)

        requirements_text = (
            REPO_ROOT / "plugins" / "zkbugs-index" / "scripts" / "requirements.txt"
        ).read_text()
        self.assertIn("Python 3.10+", requirements_text)

    def test_readme_documents_codex_stubs_and_local_findings_workspace(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        self.assertIn(".codex/skills/", readme_text)
        self.assertIn("zk-findings/", readme_text)

    def test_readme_documents_versioning_and_changelog(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        self.assertIn("## Versioning", readme_text)
        self.assertIn("CHANGELOG.md", readme_text)

        changelog_path = REPO_ROOT / "CHANGELOG.md"
        self.assertTrue(changelog_path.exists())
        changelog_text = changelog_path.read_text()
        self.assertIn("## [0.1.0]", changelog_text)

    def test_root_marketplace_lists_all_repo_plugins(self) -> None:
        marketplace_path = REPO_ROOT / ".claude-plugin" / "marketplace.json"
        self.assertTrue(marketplace_path.exists())

        marketplace = json.loads(marketplace_path.read_text())
        self.assertEqual(marketplace["name"], "zkcrypto-audit")
        self.assertEqual(marketplace["owner"]["name"], "Yue Zhou")

        manifest_paths = sorted((REPO_ROOT / "plugins").glob("*/.claude-plugin/plugin.json"))
        expected_by_name = {}
        for manifest_path in manifest_paths:
            manifest = json.loads(manifest_path.read_text())
            expected_by_name[manifest["name"]] = {
                "version": manifest["version"],
                "description": manifest["description"],
                "author_name": manifest["author"]["name"],
                "source": f"./plugins/{manifest['name']}",
            }

        actual_by_name = {}
        for plugin in marketplace["plugins"]:
            actual_by_name[plugin["name"]] = {
                "version": plugin["version"],
                "description": plugin["description"],
                "author_name": plugin["author"]["name"],
                "source": plugin["source"],
            }

        self.assertEqual(actual_by_name, expected_by_name)

    def test_root_marketplace_has_discoverability_metadata(self) -> None:
        marketplace = json.loads((REPO_ROOT / ".claude-plugin" / "marketplace.json").read_text())
        metadata = marketplace["metadata"]
        self.assertIn("repository", metadata)
        self.assertIn("homepage", metadata)
        self.assertIn("license", metadata)
        self.assertIn("keywords", metadata)
        self.assertIsInstance(metadata["keywords"], list)
        self.assertIn("zk", metadata["keywords"])
        self.assertIn("crypto", metadata["keywords"])

    def test_all_plugin_manifests_use_yue_zhou_as_author(self) -> None:
        manifest_paths = sorted((REPO_ROOT / "plugins").glob("*/.claude-plugin/plugin.json"))
        self.assertTrue(manifest_paths)

        for manifest_path in manifest_paths:
            manifest = json.loads(manifest_path.read_text())
            self.assertEqual(manifest["author"]["name"], "Yue Zhou", manifest_path.as_posix())

    def test_codex_skill_stubs_cover_all_repo_plugin_skills(self) -> None:
        plugin_skill_paths = sorted((REPO_ROOT / "plugins").glob("*/skills/*/SKILL.md"))
        self.assertTrue(plugin_skill_paths)

        for plugin_skill_path in plugin_skill_paths:
            skill_name = plugin_skill_path.parent.name
            codex_stub_path = REPO_ROOT / ".codex" / "skills" / skill_name / "SKILL.md"
            self.assertTrue(codex_stub_path.exists(), codex_stub_path.as_posix())

            codex_stub_text = codex_stub_path.read_text()
            self.assertIn(f"name: {skill_name}", codex_stub_text, codex_stub_path.as_posix())
            self.assertIn(plugin_skill_path.relative_to(REPO_ROOT).as_posix(), codex_stub_text, codex_stub_path.as_posix())

    def test_zk_findings_workspace_has_readme(self) -> None:
        readme_path = REPO_ROOT / "zk-findings" / "README.md"
        self.assertTrue(readme_path.exists())

        readme_text = readme_path.read_text().lower()
        self.assertIn("local workspace", readme_text)
        self.assertIn("org findings", readme_text)

    def test_gitignore_excludes_local_claude_settings(self) -> None:
        gitignore_text = (REPO_ROOT / ".gitignore").read_text()
        self.assertIn(".claude/settings.local.json", gitignore_text)

    def test_gitignore_covers_generated_zkbugs_index_artifacts(self) -> None:
        gitignore_text = (REPO_ROOT / ".gitignore").read_text()
        expected_entries = [
            "plugins/zkbugs-index/index/upstream_raw/",
            "plugins/zkbugs-index/index/local_findings/findings.json",
            "plugins/zkbugs-index/index/embeddings.npy",
            "plugins/zkbugs-index/index/embedding_ids.json",
            "plugins/zkbugs-index/.cache/",
        ]

        for entry in expected_entries:
            self.assertIn(entry, gitignore_text)

    def test_core_and_domain_skills_define_output_contracts(self) -> None:
        skills_to_check = [
            REPO_ROOT / "plugins" / "crypto-audit-router" / "skills" / "crypto-audit-router" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-audit-context" / "skills" / "crypto-audit-context" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-fp-check" / "skills" / "crypto-fp-check" / "SKILL.md",
            REPO_ROOT / "plugins" / "spec-delta-checker" / "skills" / "spec-delta-checker" / "SKILL.md",
            REPO_ROOT / "plugins" / "zk-circuit-auditor" / "skills" / "zk-circuit-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "rust-crypto-safety" / "skills" / "rust-crypto-safety" / "SKILL.md",
            REPO_ROOT / "plugins" / "ecc-pairing-auditor" / "skills" / "ecc-pairing-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "dkg-threshold-auditor" / "skills" / "dkg-threshold-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-report-writer" / "skills" / "crypto-report-writer" / "SKILL.md",
        ]

        for skill_path in skills_to_check:
            text = skill_path.read_text()
            self.assertIn("## Output Contract", text, skill_path.as_posix())

    def test_audit_common_and_zkbugs_index_intentionally_omit_output_contract(self) -> None:
        audit_common_text = (
            REPO_ROOT / "plugins" / "audit-common" / "skills" / "audit-common" / "SKILL.md"
        ).read_text()
        self.assertNotIn("## Output Contract", audit_common_text)
        self.assertIn("## When to Use", audit_common_text)

        zkbugs_index_text = (
            REPO_ROOT / "plugins" / "zkbugs-index" / "skills" / "zkbugs-index" / "SKILL.md"
        ).read_text()
        self.assertNotIn("## Output Contract", zkbugs_index_text)
        self.assertIn("## Workflow", zkbugs_index_text)

    def test_root_claude_md_exists_with_project_context(self) -> None:
        claude_md = REPO_ROOT / "CLAUDE.md"
        self.assertTrue(claude_md.exists())
        text = claude_md.read_text()
        self.assertIn("zkcrypto-audit", text)
        self.assertIn("python3 -m unittest", text)

    def test_zkbugs_scripts_use_shared_taxonomy_and_repo_helper(self) -> None:
        shared_path = REPO_ROOT / "plugins" / "zkbugs-index" / "scripts" / "_shared.py"
        self.assertTrue(shared_path.exists())
        shared_text = shared_path.read_text()
        self.assertIn("CANONICAL_VULN_TYPES", shared_text)
        self.assertIn("\"unknown\"", shared_text)
        self.assertIn("VULN_ALIASES", shared_text)
        self.assertIn("def ensure_repo", shared_text)

        build_text = (REPO_ROOT / "plugins" / "zkbugs-index" / "scripts" / "build_index.py").read_text()
        self.assertIn("from _shared import CANONICAL_VULN_TYPES, VULN_ALIASES, ensure_repo", build_text)
        self.assertNotIn("CANONICAL_VULN_TYPES = {", build_text)
        self.assertNotIn("VULN_ALIASES: dict[str, str] = {", build_text)
        self.assertNotIn("def ensure_repo(", build_text)

        contribute_text = (
            REPO_ROOT / "plugins" / "zkbugs-index" / "scripts" / "contribute_bug.py"
        ).read_text()
        self.assertIn("from _shared import CANONICAL_VULN_TYPES, ensure_repo", contribute_text)
        self.assertNotIn("CANONICAL_VULN_TYPES = {", contribute_text)
        self.assertNotIn("def ensure_repo(", contribute_text)

    def test_audit_common_plugin_exists_with_shared_references(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "audit-common"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "audit-common" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("severity-framework.md", skill_text)
        self.assertIn("testing-evidence.md", skill_text)
        self.assertIn("finding-contract.md", skill_text)

        severity_text = (plugin_root / "skills" / "audit-common" / "references" / "severity-framework.md").read_text()
        self.assertIn("Critical", severity_text)
        self.assertIn("High", severity_text)
        self.assertIn("Every Critical/High finding must include a compilable PoC test", severity_text)

        testing_text = (plugin_root / "skills" / "audit-common" / "references" / "testing-evidence.md").read_text()
        self.assertIn("Known-answer tests", testing_text)
        self.assertIn("Wycheproof", testing_text)
        self.assertIn("Differential testing", testing_text)

    def test_crypto_audit_context_skill_extracts_dimensional_analysis(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-audit-context"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "crypto-audit-context" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("verify what the code actually enforces", skill_text.lower())
        self.assertIn("## Audit Priority", skill_text)
        self.assertIn("## Workflow", skill_text)
        self.assertIn("dimensional-analysis.md", skill_text)
        self.assertIn("threat-model-checklist.md", skill_text)

        dimensions_text = (
            plugin_root / "skills" / "crypto-audit-context" / "references" / "dimensional-analysis.md"
        ).read_text()
        self.assertIn("Algebraic domain", dimensions_text)
        self.assertIn("Group membership", dimensions_text)
        self.assertIn("Sequence position", dimensions_text)

        threat_text = (
            plugin_root / "skills" / "crypto-audit-context" / "references" / "threat-model-checklist.md"
        ).read_text()
        self.assertIn("Threat model documented", threat_text)
        self.assertIn("Key authentication chain", threat_text)
        self.assertIn("Replay attack prevention", threat_text)

    def test_crypto_fp_check_skill_has_verification_gate_workflow(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-fp-check"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "crypto-fp-check" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("## Rationalizations to Reject", skill_text)
        self.assertIn("verification-gates.md", skill_text)

        workflow_text = (
            plugin_root / "skills" / "crypto-fp-check" / "workflows" / "verification-gates.md"
        ).read_text()
        self.assertIn("Phase 1", workflow_text)
        self.assertIn("Phase 2", workflow_text)
        self.assertIn("TRUE POSITIVE", workflow_text)
        self.assertIn("FALSE POSITIVE", workflow_text)
        self.assertIn("Critical/High", workflow_text)
        self.assertIn("compilable PoC", workflow_text)

    def test_zk_circuit_auditor_extracts_zk_specific_checklist_and_workflows(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "zk-circuit-auditor"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "zk-circuit-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("zk-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("transcript-review.md", skill_text)
        self.assertIn("setup-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "zk-circuit-auditor" / "references" / "zk-checklist.md"
        ).read_text()
        self.assertIn("Under-constrained signals", checklist_text)
        self.assertIn("Fiat-Shamir transcript completeness", checklist_text)
        self.assertIn("KZG trusted setup provenance", checklist_text)
        self.assertIn("Recursion public input threading", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "zk-circuit-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Verifier missing context-binding field", patterns_text)
        self.assertIn("Transcript absorb order mismatch", patterns_text)
        self.assertIn("Challenge derived too early", patterns_text)
        self.assertIn("Default/zero values after parse failure", patterns_text)
        self.assertIn("Unverified and verified objects sharing same type", patterns_text)
        self.assertIn("frozen heart", patterns_text.lower())

        transcript_workflow_text = (
            plugin_root / "skills" / "zk-circuit-auditor" / "workflows" / "transcript-review.md"
        ).read_text()
        self.assertIn("ALL prior prover messages", transcript_workflow_text)
        self.assertIn("domain separation", transcript_workflow_text.lower())
        self.assertIn("public input encoding", transcript_workflow_text.lower())

        setup_workflow_text = (
            plugin_root / "skills" / "zk-circuit-auditor" / "workflows" / "setup-review.md"
        ).read_text()
        self.assertIn("KZG trusted setup provenance", setup_workflow_text)
        self.assertIn("KZG opening point soundness", setup_workflow_text)
        self.assertIn("Batch verification random challenge", setup_workflow_text)

    def test_rust_crypto_safety_extracts_rust_checklist_patterns_and_toolchain(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "rust-crypto-safety"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "rust-crypto-safety" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("rust-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("toolchain.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "rust-crypto-safety" / "references" / "rust-checklist.md"
        ).read_text()
        self.assertIn("Constant-time throughout", checklist_text)
        self.assertIn("Zeroize all secret material", checklist_text)
        self.assertIn("All `unsafe` blocks audited individually", checklist_text)
        self.assertIn("Manual `Send`/`Sync` impls", checklist_text)
        self.assertIn("Dependency version pinning", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "rust-crypto-safety" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Feature flags changing security semantics", patterns_text)
        self.assertIn("`unchecked` constructors exposed too widely", patterns_text)
        self.assertIn("Secret-dependent timing", patterns_text)
        self.assertIn("Unsound `unsafe impl Send/Sync`", patterns_text)
        self.assertIn("zeroize", patterns_text.lower())
        self.assertIn("transmute", patterns_text)
        self.assertIn("ConditionallySelectable", patterns_text)

        toolchain_text = (
            plugin_root / "skills" / "rust-crypto-safety" / "references" / "toolchain.md"
        ).read_text()
        self.assertIn("cargo audit", toolchain_text)
        self.assertIn("cargo geiger", toolchain_text)
        self.assertIn("cargo-fuzz", toolchain_text)
        self.assertIn("dudect", toolchain_text)
        self.assertIn("cargo tree", toolchain_text)

    def test_ecc_pairing_auditor_extracts_curve_pairing_checklists_and_workflows(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "ecc-pairing-auditor"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "ecc-pairing-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("ecc-checklist.md", skill_text)
        self.assertIn("pairing-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("deserialization-review.md", skill_text)
        self.assertIn("pairing-review.md", skill_text)

        ecc_text = (
            plugin_root / "skills" / "ecc-pairing-auditor" / "references" / "ecc-checklist.md"
        ).read_text()
        self.assertIn("Point validity on deserialization", ecc_text)
        self.assertIn("Subgroup membership check", ecc_text)
        self.assertIn("Cofactor clearing on G2", ecc_text)
        self.assertIn("Batch inversion safety", ecc_text)

        pairing_text = (
            plugin_root / "skills" / "ecc-pairing-auditor" / "references" / "pairing-checklist.md"
        ).read_text()
        self.assertIn("Rogue key / key cancellation attack", pairing_text)
        self.assertIn("Pairing equation direction", pairing_text)
        self.assertIn("BLS domain separation (DST)", pairing_text)
        self.assertIn("Batch verification randomness", pairing_text)

        patterns_text = (
            plugin_root / "skills" / "ecc-pairing-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Parsed objects used before validation", patterns_text)
        self.assertIn("Missing subgroup/on-curve checks", patterns_text)
        self.assertIn("Non-canonical encodings accepted", patterns_text)
        self.assertIn("Batch verification masking invalid items", patterns_text)
        self.assertIn("Optimized backend diverging from reference", patterns_text)
        self.assertIn("small-subgroup", patterns_text.lower())
        self.assertIn("hash_to_curve", patterns_text)

        deserialization_workflow_text = (
            plugin_root / "skills" / "ecc-pairing-auditor" / "workflows" / "deserialization-review.md"
        ).read_text()
        self.assertIn("is_on_curve()", deserialization_workflow_text)
        self.assertIn("is_in_correct_subgroup_assuming_on_curve()", deserialization_workflow_text)
        self.assertIn("non-canonical", deserialization_workflow_text.lower())

        pairing_workflow_text = (
            plugin_root / "skills" / "ecc-pairing-auditor" / "workflows" / "pairing-review.md"
        ).read_text()
        self.assertIn("final exponentiation", pairing_workflow_text.lower())
        self.assertIn("multi-Miller loop", pairing_workflow_text)
        self.assertIn("rogue key", pairing_workflow_text.lower())

    def test_dkg_threshold_auditor_extracts_nonce_share_and_session_guidance(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "dkg-threshold-auditor"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "dkg-threshold-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("dkg-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("session-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "dkg-threshold-auditor" / "references" / "dkg-checklist.md"
        ).read_text()
        self.assertIn("Rogue key attack", checklist_text)
        self.assertIn("FROST nonce binding", checklist_text)
        self.assertIn("VSS share verification", checklist_text)
        self.assertIn("Concurrent session isolation", checklist_text)
        self.assertIn("Identifier space validation", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "dkg-threshold-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Nonce reuse via shared state or retries", patterns_text)
        self.assertIn("private key recovery", patterns_text.lower())
        self.assertIn("RFC 6979", patterns_text)
        self.assertIn("Wagner", patterns_text)

        session_workflow_text = (
            plugin_root / "skills" / "dkg-threshold-auditor" / "workflows" / "session-review.md"
        ).read_text()
        self.assertIn("aggregate public key", session_workflow_text)
        self.assertIn("public polynomial commitments", session_workflow_text)
        self.assertIn("Lagrange", session_workflow_text)

    def test_spec_delta_checker_extracts_deviation_review_workflow(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "spec-delta-checker"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "spec-delta-checker" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("verify what the code actually enforces", skill_text.lower())
        self.assertIn("delta-review.md", skill_text)

        workflow_text = (
            plugin_root / "skills" / "spec-delta-checker" / "workflows" / "delta-review.md"
        ).read_text()
        self.assertIn("reference specification or paper", workflow_text.lower())
        self.assertIn("implementation deviates", workflow_text.lower())
        self.assertIn("highest-probability bug locations", workflow_text.lower())
        self.assertIn("caller obligations", workflow_text.lower())

    def test_crypto_report_writer_extracts_severity_and_test_evidence_template(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-report-writer"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "crypto-report-writer" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("report-template.md", skill_text)

        template_text = (
            plugin_root / "skills" / "crypto-report-writer" / "templates" / "report-template.md"
        ).read_text()
        self.assertIn("Critical", template_text)
        self.assertIn("High", template_text)
        self.assertIn("Medium", template_text)
        self.assertIn("Low", template_text)
        self.assertIn("Known-answer tests", template_text)
        self.assertIn("Negative tests", template_text)
        self.assertIn("Differential testing", template_text)
        self.assertIn("Wycheproof", template_text)
        self.assertIn("compilable PoC", template_text)

    def test_crypto_audit_router_defines_end_to_end_routing(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-audit-router"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "crypto-audit-router" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("routing-matrix.md", skill_text)
        self.assertIn("full-audit-flow.md", skill_text)
        self.assertIn("crypto-audit-context", skill_text)
        self.assertIn("crypto-fp-check", skill_text)
        self.assertIn("crypto-report-writer", skill_text)
        self.assertIn("zkbugs-index", skill_text)

        matrix_text = (
            plugin_root / "skills" / "crypto-audit-router" / "references" / "routing-matrix.md"
        ).read_text()
        self.assertIn("ecc-pairing-auditor", matrix_text)
        self.assertIn("zk-circuit-auditor", matrix_text)
        self.assertIn("dkg-threshold-auditor", matrix_text)
        self.assertIn("rust-crypto-safety", matrix_text)
        self.assertIn("spec-delta-checker", matrix_text)

        flow_text = (
            plugin_root / "skills" / "crypto-audit-router" / "workflows" / "full-audit-flow.md"
        ).read_text()
        self.assertIn("crypto-audit-context", flow_text)
        self.assertIn("crypto-fp-check", flow_text)
        self.assertIn("crypto-report-writer", flow_text)
        self.assertIn("zkbugs-index", flow_text)


if __name__ == "__main__":
    unittest.main()
