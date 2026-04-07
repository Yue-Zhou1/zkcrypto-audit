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
        zkbugs_rebuild_path = REPO_ROOT / ".github" / "workflows" / "zkbugs-rebuild.yml"

        self.assertTrue(ci_path.exists())
        self.assertTrue(release_path.exists())
        self.assertTrue(zkbugs_rebuild_path.exists())

        ci_text = ci_path.read_text()
        self.assertIn("python-version", ci_text)
        self.assertIn("3.10", ci_text)
        self.assertIn("3.11", ci_text)
        self.assertIn("3.12", ci_text)
        self.assertIn("python3 -m unittest discover -s tests -q", ci_text)
        self.assertIn("python3 -m py_compile", ci_text)
        self.assertIn(".claude/settings.local.json", ci_text)

        zkbugs_rebuild_text = zkbugs_rebuild_path.read_text()
        self.assertIn("schedule:", zkbugs_rebuild_text)
        self.assertIn("workflow_dispatch:", zkbugs_rebuild_text)
        self.assertIn(
            "python3 plugins/evidence-and-tooling/scripts/build_index.py --config plugins/evidence-and-tooling/config/zkbugs-sources.json --diff-upstream",
            zkbugs_rebuild_text,
        )

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
            / "core-audit-flow"
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
            / "core-audit-flow"
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
            / "core-audit-flow"
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
            REPO_ROOT / "plugins" / "crypto-primitive-auditors" / "skills" / "ecc-pairing-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "zk-and-vm-auditors" / "skills" / "zk-circuit-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "protocol-auditors" / "skills" / "dkg-threshold-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "implementation-safety" / "skills" / "rust-crypto-safety" / "SKILL.md",
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "crypto-fp-check" / "SKILL.md",
            REPO_ROOT / "plugins" / "evidence-and-tooling" / "skills" / "zkbugs-index" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-primitive-auditors" / "skills" / "ethereum-crypto-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "zk-and-vm-auditors" / "skills" / "folding-scheme-auditor" / "SKILL.md",
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
            REPO_ROOT / "plugins" / "evidence-and-tooling" / "scripts" / "requirements.txt"
        ).read_text()
        self.assertIn("Python 3.10+", requirements_text)

    def test_readme_documents_codex_stubs_and_local_findings_workspace(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        self.assertIn(".codex/skills/", readme_text)
        self.assertIn("zk-findings/", readme_text)

    def test_readme_keeps_contributing_and_acknowledgments(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        self.assertIn("## Contributing", readme_text)
        self.assertIn("## Acknowledgments", readme_text)

    def test_release_workflow_matches_collection_version_and_changelog(self) -> None:
        changelog_path = REPO_ROOT / "CHANGELOG.md"
        self.assertTrue(changelog_path.exists())
        changelog_text = changelog_path.read_text()

        marketplace = json.loads((REPO_ROOT / ".claude-plugin" / "marketplace.json").read_text())
        collection_version = marketplace["metadata"]["version"]

        self.assertIn(f"## [{collection_version}]", changelog_text)

        release_text = (REPO_ROOT / ".github" / "workflows" / "release.yml").read_text()
        self.assertIn(f"Release tag (for example: v{collection_version})", release_text)

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
            category_dir = manifest_path.parent.parent.name
            expected_by_name[manifest["name"]] = {
                "version": manifest["version"],
                "description": manifest["description"],
                "author_name": manifest["author"]["name"],
                "source": f"./plugins/{category_dir}",
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

    def test_session_state_workspace_schema_and_handoff_docs_exist(self) -> None:
        sessions_readme = REPO_ROOT / "zk-findings" / "sessions" / "README.md"
        schema_path = REPO_ROOT / "zk-findings" / "sessions" / "session-state-schema.json"
        self.assertTrue(sessions_readme.exists())
        self.assertTrue(schema_path.exists())

        schema = json.loads(schema_path.read_text())
        props = schema.get("properties", {})
        self.assertIn("engagement_id", props)
        self.assertIn("targets", props)
        self.assertIn("trust_boundaries", props)
        self.assertIn("open_findings", props)
        self.assertIn("verified_findings", props)
        self.assertIn("next_steps", props)

        context_text = (
            REPO_ROOT
            / "plugins"
            / "core-audit-flow"
            / "skills"
            / "crypto-audit-context"
            / "SKILL.md"
        ).read_text().lower()
        self.assertIn("session state", context_text)
        self.assertIn("zk-findings/sessions", context_text)

        flow_text = (
            REPO_ROOT
            / "plugins"
            / "core-audit-flow"
            / "skills"
            / "crypto-audit-router"
            / "workflows"
            / "full-audit-flow.md"
        ).read_text().lower()
        self.assertIn("session state", flow_text)
        self.assertIn("handoff", flow_text)

    def test_gitignore_excludes_local_claude_settings(self) -> None:
        gitignore_text = (REPO_ROOT / ".gitignore").read_text()
        self.assertIn(".claude/settings.local.json", gitignore_text)

    def test_gitignore_covers_generated_zkbugs_index_artifacts(self) -> None:
        gitignore_text = (REPO_ROOT / ".gitignore").read_text()
        expected_entries = [
            "plugins/evidence-and-tooling/index/upstream_raw/",
            "plugins/evidence-and-tooling/index/local_findings/findings.json",
            "plugins/evidence-and-tooling/index/embeddings.npy",
            "plugins/evidence-and-tooling/index/embedding_ids.json",
            "plugins/evidence-and-tooling/.cache/",
        ]

        for entry in expected_entries:
            self.assertIn(entry, gitignore_text)

    def test_core_and_domain_skills_define_output_contracts(self) -> None:
        skills_to_check = [
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "crypto-audit-router" / "SKILL.md",
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "crypto-audit-context" / "SKILL.md",
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "crypto-fp-check" / "SKILL.md",
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "spec-delta-checker" / "SKILL.md",
            REPO_ROOT / "plugins" / "zk-and-vm-auditors" / "skills" / "zk-circuit-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "implementation-safety" / "skills" / "rust-crypto-safety" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-primitive-auditors" / "skills" / "ecc-pairing-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "protocol-auditors" / "skills" / "dkg-threshold-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "crypto-report-writer" / "SKILL.md",
            REPO_ROOT / "plugins" / "crypto-primitive-auditors" / "skills" / "ethereum-crypto-auditor" / "SKILL.md",
            REPO_ROOT / "plugins" / "zk-and-vm-auditors" / "skills" / "folding-scheme-auditor" / "SKILL.md",
        ]

        for skill_path in skills_to_check:
            text = skill_path.read_text()
            self.assertIn("## Output Contract", text, skill_path.as_posix())

    def test_audit_common_and_zkbugs_index_intentionally_omit_output_contract(self) -> None:
        audit_common_text = (
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills" / "audit-common" / "SKILL.md"
        ).read_text()
        self.assertNotIn("## Output Contract", audit_common_text)
        self.assertIn("## When to Use", audit_common_text)

        zkbugs_index_text = (
            REPO_ROOT / "plugins" / "evidence-and-tooling" / "skills" / "zkbugs-index" / "SKILL.md"
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
        shared_path = REPO_ROOT / "plugins" / "evidence-and-tooling" / "scripts" / "_shared.py"
        self.assertTrue(shared_path.exists())
        shared_text = shared_path.read_text()
        self.assertIn("CANONICAL_VULN_TYPES", shared_text)
        self.assertIn("\"unknown\"", shared_text)
        self.assertIn("VULN_ALIASES", shared_text)
        self.assertIn("def ensure_repo", shared_text)

        build_text = (REPO_ROOT / "plugins" / "evidence-and-tooling" / "scripts" / "build_index.py").read_text()
        self.assertIn("from _shared import CANONICAL_VULN_TYPES, VULN_ALIASES, ensure_repo", build_text)
        self.assertNotIn("CANONICAL_VULN_TYPES = {", build_text)
        self.assertNotIn("VULN_ALIASES: dict[str, str] = {", build_text)
        self.assertNotIn("def ensure_repo(", build_text)

        contribute_text = (
            REPO_ROOT / "plugins" / "evidence-and-tooling" / "scripts" / "contribute_bug.py"
        ).read_text()
        self.assertIn("from _shared import CANONICAL_VULN_TYPES, ensure_repo", contribute_text)
        self.assertNotIn("CANONICAL_VULN_TYPES = {", contribute_text)
        self.assertNotIn("def ensure_repo(", contribute_text)

    def test_zkbugs_config_and_manifest_cover_supplemental_external_findings(self) -> None:
        config = json.loads(
            (REPO_ROOT / "plugins" / "evidence-and-tooling" / "config" / "zkbugs-sources.json").read_text()
        )
        supplemental_files = config.get("supplemental_files", [])
        self.assertIn("./data/external_findings/trail-of-bits.json", supplemental_files)
        self.assertIn("./data/external_findings/zellic.json", supplemental_files)
        self.assertIn("./data/external_findings/audit-contests.json", supplemental_files)

        for rel_path in supplemental_files:
            file_path = REPO_ROOT / "plugins" / "evidence-and-tooling" / rel_path.removeprefix("./")
            self.assertTrue(file_path.exists(), file_path.as_posix())

        manifest = json.loads((REPO_ROOT / "plugins" / "evidence-and-tooling" / "index" / "manifest.json").read_text())
        vuln_counts = manifest.get("by_vuln_type", {})
        required_backfilled_types = [
            "nonce_reuse",
            "arithmetic_overflow",
            "missing_range_check",
            "missing_nullifier",
            "trusted_setup_leak",
            "prover_input_injection",
            "lookup_table_mismatch",
            "missing_public_input",
            "privacy_leak",
            "subgroup_attack",
            "timing_side_channel",
            "configuration_error",
        ]
        for vuln_type in required_backfilled_types:
            self.assertGreater(vuln_counts.get(vuln_type, 0), 0, vuln_type)

    def test_audit_common_plugin_exists_with_shared_references(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "core-audit-flow"
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
        plugin_root = REPO_ROOT / "plugins" / "core-audit-flow"
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
        plugin_root = REPO_ROOT / "plugins" / "core-audit-flow"
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
        plugin_root = REPO_ROOT / "plugins" / "zk-and-vm-auditors"
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
        plugin_root = REPO_ROOT / "plugins" / "implementation-safety"
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
        plugin_root = REPO_ROOT / "plugins" / "crypto-primitive-auditors"
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
        plugin_root = REPO_ROOT / "plugins" / "protocol-auditors"
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
        plugin_root = REPO_ROOT / "plugins" / "core-audit-flow"
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
        plugin_root = REPO_ROOT / "plugins" / "core-audit-flow"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "crypto-report-writer" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("report-template.md", skill_text)
        self.assertIn("client-report-template.md", skill_text)
        self.assertIn("internal-report-template.md", skill_text)
        self.assertIn("public-disclosure-template.md", skill_text)

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

        client_template = (
            plugin_root
            / "skills"
            / "crypto-report-writer"
            / "templates"
            / "client-report-template.md"
        )
        internal_template = (
            plugin_root
            / "skills"
            / "crypto-report-writer"
            / "templates"
            / "internal-report-template.md"
        )
        disclosure_template = (
            plugin_root
            / "skills"
            / "crypto-report-writer"
            / "templates"
            / "public-disclosure-template.md"
        )
        self.assertTrue(client_template.exists())
        self.assertTrue(internal_template.exists())
        self.assertTrue(disclosure_template.exists())

        self.assertIn("executive summary", client_template.read_text().lower())
        self.assertIn("investigation notes", internal_template.read_text().lower())
        self.assertIn("disclosure timeline", disclosure_template.read_text().lower())

    def test_collection_docs_reflect_final_plugin_count_and_todo_progress(self) -> None:
        readme_text = (REPO_ROOT / "README.md").read_text()
        claude_text = (REPO_ROOT / "CLAUDE.md").read_text()
        todo_path = REPO_ROOT / "TODO.md"
        if not todo_path.exists():
            self.skipTest("TODO.md is not present in this checkout")
        todo_text = todo_path.read_text()

        self.assertIn("plugins-7_categories%2F29_skills", readme_text)
        self.assertIn("7 category plugins housing 29 audit skills", claude_text)
        self.assertIn("Phase 1: Auditor Expansion", todo_text)
        self.assertIn("- [x] `formal-verification-bridge`", todo_text)
        self.assertIn("- [x] Add report template variants (client/internal/public-disclosure)", todo_text)

    def test_crypto_audit_router_defines_end_to_end_routing(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "core-audit-flow"
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
        self.assertIn("cairo-auditor", matrix_text)
        self.assertIn("noir-auditor", matrix_text)
        self.assertIn("zkvm-auditor", matrix_text)
        self.assertIn("hash-function-auditor", matrix_text)
        self.assertIn("commitment-scheme-auditor", matrix_text)
        self.assertIn("merkle-tree-auditor", matrix_text)
        self.assertIn("fiat-shamir-auditor", matrix_text)
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

    def test_cairo_auditor_extracts_hint_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "zk-and-vm-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "cairo-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("cairo-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("hint-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "cairo-auditor" / "references" / "cairo-checklist.md"
        ).read_text()
        self.assertIn("Hint validation", checklist_text)
        self.assertIn("felt252 overflow", checklist_text)
        self.assertIn("Builtin misuse", checklist_text)
        self.assertIn("Sierra-to-CASM soundness", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "cairo-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Unvalidated hint output trusted by constraints", patterns_text)
        self.assertIn("felt252 arithmetic wrapping silently", patterns_text)
        self.assertIn("assert_range_u128 missing", patterns_text)

        hint_workflow_text = (
            plugin_root / "skills" / "cairo-auditor" / "workflows" / "hint-review.md"
        ).read_text()
        self.assertIn("hint function", hint_workflow_text.lower())
        self.assertIn("constraint enforcement", hint_workflow_text.lower())

    def test_noir_auditor_extracts_unconstrained_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "zk-and-vm-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "noir-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("noir-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("unconstrained-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "noir-auditor" / "references" / "noir-checklist.md"
        ).read_text()
        self.assertIn("Unconstrained function boundaries", checklist_text)
        self.assertIn("Oracle safety", checklist_text)
        self.assertIn("Brillig vs ACIR", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "noir-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Unconstrained function return trusted without assertion", patterns_text)
        self.assertIn("Oracle result used in constrained context without binding", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "noir-auditor" / "workflows" / "unconstrained-review.md"
        ).read_text()
        self.assertIn("unconstrained function", workflow_text.lower())
        self.assertIn("constrained assertion", workflow_text.lower())

    def test_zkvm_auditor_extracts_precompile_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "zk-and-vm-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "zkvm-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("zkvm-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("precompile-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "zkvm-auditor" / "references" / "zkvm-checklist.md"
        ).read_text()
        self.assertIn("Memory consistency", checklist_text)
        self.assertIn("Continuation proof", checklist_text)
        self.assertIn("Precompile safety", checklist_text)
        self.assertIn("Guest-host boundary", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "zkvm-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Precompile output trusted without constraint verification", patterns_text)
        self.assertIn("Memory access not enforced by memory consistency checks", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "zkvm-auditor" / "workflows" / "precompile-review.md"
        ).read_text()
        self.assertIn("precompile", workflow_text.lower())
        self.assertIn("guest-host", workflow_text.lower())

    def test_hash_function_auditor_extracts_sponge_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-primitive-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "hash-function-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("hash-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("sponge-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "hash-function-auditor" / "references" / "hash-checklist.md"
        ).read_text()
        self.assertIn("Parameter selection", checklist_text)
        self.assertIn("Sponge construction", checklist_text)
        self.assertIn("Domain separation", checklist_text)
        self.assertIn("Algebraic attack resistance", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "hash-function-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Poseidon round constants", patterns_text)
        self.assertIn("Sponge capacity overflow", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "hash-function-auditor" / "workflows" / "sponge-review.md"
        ).read_text()
        self.assertIn("sponge", workflow_text.lower())
        self.assertIn("absorption", workflow_text.lower())

    def test_commitment_scheme_auditor_extracts_kzg_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-primitive-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "commitment-scheme-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("commitment-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("kzg-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "commitment-scheme-auditor" / "references" / "commitment-checklist.md"
        ).read_text()
        self.assertIn("Degree bound", checklist_text)
        self.assertIn("Evaluation proof", checklist_text)
        self.assertIn("Trusted setup", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "commitment-scheme-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Degree bound check missing", patterns_text)
        self.assertIn("evaluation point reuse", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "commitment-scheme-auditor" / "workflows" / "kzg-review.md"
        ).read_text()
        self.assertIn("KZG", workflow_text)
        self.assertIn("opening proof", workflow_text.lower())

    def test_merkle_tree_auditor_extracts_proof_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-primitive-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "merkle-tree-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("merkle-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("proof-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "merkle-tree-auditor" / "references" / "merkle-checklist.md"
        ).read_text()
        self.assertIn("Second-preimage resistance", checklist_text)
        self.assertIn("Leaf-node domain separation", checklist_text)
        self.assertIn("Sparse tree", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "merkle-tree-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Leaf and internal node hash without domain separation", patterns_text)
        self.assertIn("Proof verification accepts empty path", patterns_text)

    def test_fiat_shamir_auditor_extracts_transcript_binding_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-primitive-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "fiat-shamir-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("fiat-shamir-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("transcript-binding-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "fiat-shamir-auditor" / "references" / "fiat-shamir-checklist.md"
        ).read_text()
        self.assertIn("Transcript completeness", checklist_text)
        self.assertIn("Domain separation", checklist_text)
        self.assertIn("Challenge derivation order", checklist_text)
        self.assertIn("Public input binding", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "fiat-shamir-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("Frozen heart", patterns_text)
        self.assertIn("Challenge derived before all commitments absorbed", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "fiat-shamir-auditor" / "workflows" / "transcript-binding-review.md"
        ).read_text()
        self.assertIn("transcript", workflow_text.lower())
        self.assertIn("challenge", workflow_text.lower())
        self.assertIn("binding", workflow_text.lower())

    def test_kani_harness_gen_extracts_checklist_and_patterns(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "evidence-and-tooling"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "kani-harness-gen" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("user-triggered", skill_text.lower())
        self.assertIn("kani-checklist.md", skill_text)
        self.assertIn("harness-patterns.md", skill_text)
        self.assertNotIn("**Constant-time**", skill_text)
        self.assertIn("does not prove constant-time behavior", skill_text)
        self.assertIn("dudect", skill_text)
        self.assertIn("side-channel-auditor", skill_text)
        self.assertIn("KANI_TIMEOUT_SECONDS", skill_text)
        self.assertIn("PROPTEST_CASES", skill_text)

        checklist_text = (
            plugin_root / "skills" / "kani-harness-gen" / "references" / "kani-checklist.md"
        ).read_text()
        self.assertIn("cargo-kani", checklist_text)
        self.assertIn("#[kani::proof]", checklist_text)
        self.assertIn("kani::any()", checklist_text)
        self.assertIn("KANI_TIMEOUT_SECONDS", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "kani-harness-gen" / "references" / "harness-patterns.md"
        ).read_text()
        self.assertIn("Field arithmetic", patterns_text)
        self.assertIn("Serialization roundtrip", patterns_text)
        self.assertIn("No-panic", patterns_text)
        self.assertIn("proptest", patterns_text.lower())

    def test_fuzz_harness_gen_extracts_checklist_and_patterns(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "evidence-and-tooling"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "fuzz-harness-gen" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("user-triggered", skill_text.lower())
        self.assertIn("fuzz-checklist.md", skill_text)
        self.assertIn("target-patterns.md", skill_text)
        self.assertIn("FUZZ_TIME_LIMIT", skill_text)
        self.assertIn("FUZZ_MAX_ITERS", skill_text)
        self.assertIn("PROPTEST_CASES", skill_text)

        checklist_text = (
            plugin_root / "skills" / "fuzz-harness-gen" / "references" / "fuzz-checklist.md"
        ).read_text()
        self.assertIn("cargo-fuzz", checklist_text)
        self.assertIn("fuzz_target!", checklist_text)
        self.assertIn("libfuzzer", checklist_text.lower())
        self.assertIn("FUZZ_TIME_LIMIT", checklist_text)
        self.assertIn("FUZZ_MAX_ITERS", checklist_text)

        patterns_text = (
            plugin_root / "skills" / "fuzz-harness-gen" / "references" / "target-patterns.md"
        ).read_text()
        self.assertIn("Deserialization", patterns_text)
        self.assertIn("Point decompression", patterns_text)
        self.assertIn("Proof verification", patterns_text)
        self.assertIn("mutated proof", patterns_text.lower())
        self.assertIn("circuit synthesize", patterns_text.lower())
        self.assertIn("proptest", patterns_text.lower())

    def test_todo_marks_kani_constant_time_as_superseded(self) -> None:
        todo_path = REPO_ROOT / "TODO.md"
        if not todo_path.exists():
            self.skipTest("TODO.md is not present in this checkout")
        todo_text = todo_path.read_text()
        self.assertIn("side-channel-auditor", todo_text)
        self.assertNotIn("Constant-time verification (no secret-dependent branching)", todo_text)

    def test_gnark_auditor_extracts_frontend_backend_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "zk-and-vm-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "gnark-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("gnark-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("frontend-backend-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "gnark-auditor" / "references" / "gnark-checklist.md"
        ).read_text()
        self.assertIn("frontend/backend mismatch", checklist_text.lower())
        self.assertIn("public witness", checklist_text.lower())
        self.assertIn("constraint api misuse", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "gnark-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("frontend witness accepted but backend constraint omitted", patterns_text)
        self.assertIn("secret value promoted to public witness", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "gnark-auditor" / "workflows" / "frontend-backend-review.md"
        ).read_text()
        self.assertIn("frontend", workflow_text.lower())
        self.assertIn("backend", workflow_text.lower())
        self.assertIn("witness", workflow_text.lower())

    def test_encryption_scheme_auditor_extracts_decrypt_error_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "crypto-primitive-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "encryption-scheme-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("encryption-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("decrypt-error-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "encryption-scheme-auditor" / "references" / "encryption-checklist.md"
        ).read_text()
        self.assertIn("nonce", checklist_text.lower())
        self.assertIn("associated-data", checklist_text.lower())
        self.assertIn("padding", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "encryption-scheme-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("reused nonce under same key", patterns_text)
        self.assertIn("plaintext released before tag check", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "encryption-scheme-auditor" / "workflows" / "decrypt-error-review.md"
        ).read_text()
        self.assertIn("decrypt", workflow_text.lower())
        self.assertIn("tag", workflow_text.lower())
        self.assertIn("nonce", workflow_text.lower())

    def test_mpc_auditor_extracts_share_validation_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "protocol-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "mpc-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("mpc-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("share-validation-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "mpc-auditor" / "references" / "mpc-checklist.md"
        ).read_text()
        self.assertIn("participant authentication", checklist_text.lower())
        self.assertIn("oblivious transfer", checklist_text.lower())
        self.assertIn("share", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "mpc-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("unchecked share accepted into reconstruction", patterns_text)
        self.assertIn("beaver triple not authenticated", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "mpc-auditor" / "workflows" / "share-validation-review.md"
        ).read_text()
        self.assertIn("offline", workflow_text.lower())
        self.assertIn("online", workflow_text.lower())
        self.assertIn("session", workflow_text.lower())

    def test_vdf_auditor_extracts_challenge_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "protocol-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "vdf-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("vdf-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("challenge-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "vdf-auditor" / "references" / "vdf-checklist.md"
        ).read_text()
        self.assertIn("delay parameter", checklist_text.lower())
        self.assertIn("challenge prime", checklist_text.lower())
        self.assertIn("wesolowski", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "vdf-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("verifier accepts malformed proof exponent", patterns_text)
        self.assertIn("challenge derived from incomplete transcript", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "vdf-auditor" / "workflows" / "challenge-review.md"
        ).read_text()
        self.assertIn("sequential", workflow_text.lower())
        self.assertIn("challenge", workflow_text.lower())
        self.assertIn("verifier", workflow_text.lower())

    def test_lattice_auditor_extracts_parameter_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "post-quantum-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "lattice-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("lattice-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("parameter-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "lattice-auditor" / "references" / "lattice-checklist.md"
        ).read_text()
        self.assertIn("lwe", checklist_text.lower())
        self.assertIn("rejection sampling", checklist_text.lower())
        self.assertIn("decryption failure", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "lattice-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("rejection sampling bias leaks structure", patterns_text)
        self.assertIn("decryption failure probability underestimated", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "lattice-auditor" / "workflows" / "parameter-review.md"
        ).read_text()
        self.assertIn("parameter", workflow_text.lower())
        self.assertIn("sampling", workflow_text.lower())
        self.assertIn("decapsulation", workflow_text.lower())

    def test_fhe_auditor_extracts_noise_budget_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "post-quantum-auditors"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "fhe-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("fhe-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("noise-budget-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "fhe-auditor" / "references" / "fhe-checklist.md"
        ).read_text()
        self.assertIn("noise growth", checklist_text.lower())
        self.assertIn("bootstrapping", checklist_text.lower())
        self.assertIn("modulus", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "fhe-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("noise budget exhausted before claimed depth", patterns_text)
        self.assertIn("modulus switch drops precision silently", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "fhe-auditor" / "workflows" / "noise-budget-review.md"
        ).read_text()
        self.assertIn("noise", workflow_text.lower())
        self.assertIn("bootstrapping", workflow_text.lower())
        self.assertIn("key-switch", workflow_text.lower())

    def test_side_channel_auditor_extracts_constant_time_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "implementation-safety"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "side-channel-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("side-channel-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("constant-time-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "side-channel-auditor" / "references" / "side-channel-checklist.md"
        ).read_text()
        self.assertIn("secret-dependent branches", checklist_text.lower())
        self.assertIn("table lookups", checklist_text.lower())
        self.assertIn("cache", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "side-channel-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("branch on secret scalar bit", patterns_text)
        self.assertIn("compiler optimization reintroduces branch", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "side-channel-auditor" / "workflows" / "constant-time-review.md"
        ).read_text()
        self.assertIn("constant-time", workflow_text.lower())
        self.assertIn("dudect", workflow_text.lower())
        self.assertIn("ctgrind", workflow_text.lower())

    def test_dependency_auditor_extracts_advisory_review_and_checklist(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "implementation-safety"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "dependency-auditor" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("dependency-checklist.md", skill_text)
        self.assertIn("finding-patterns.md", skill_text)
        self.assertIn("advisory-review.md", skill_text)

        checklist_text = (
            plugin_root / "skills" / "dependency-auditor" / "references" / "dependency-checklist.md"
        ).read_text()
        self.assertIn("advisories", checklist_text.lower())
        self.assertIn("feature-flag", checklist_text.lower())
        self.assertIn("transitive", checklist_text.lower())

        patterns_text = (
            plugin_root / "skills" / "dependency-auditor" / "references" / "finding-patterns.md"
        ).read_text()
        self.assertIn("vulnerable version pinned transitively", patterns_text)
        self.assertIn("feature flag disables subgroup checks", patterns_text)

        workflow_text = (
            plugin_root / "skills" / "dependency-auditor" / "workflows" / "advisory-review.md"
        ).read_text()
        self.assertIn("dependency graph", workflow_text.lower())
        self.assertIn("advisories", workflow_text.lower())
        self.assertIn("fork", workflow_text.lower())

    def test_formal_verification_bridge_extracts_tooling_matrix_and_handoff_contract(self) -> None:
        plugin_root = REPO_ROOT / "plugins" / "evidence-and-tooling"
        self.assertTrue((plugin_root / ".claude-plugin" / "plugin.json").exists())

        skill_path = plugin_root / "skills" / "formal-verification-bridge" / "SKILL.md"
        self.assertTrue(skill_path.exists())
        skill_text = skill_path.read_text()
        self.assertIn("## When to Use", skill_text)
        self.assertIn("## When NOT to Use", skill_text)
        self.assertIn("user-triggered", skill_text.lower())
        self.assertIn("tooling-matrix.md", skill_text)
        self.assertIn("handoff-contract.md", skill_text)
        self.assertIn("export-review.md", skill_text)

        tooling_text = (
            plugin_root / "skills" / "formal-verification-bridge" / "references" / "tooling-matrix.md"
        ).read_text()
        self.assertIn("Ecne", tooling_text)
        self.assertIn("Picus", tooling_text)
        self.assertIn("Circomspect", tooling_text)

        handoff_text = (
            plugin_root / "skills" / "formal-verification-bridge" / "references" / "handoff-contract.md"
        ).read_text()
        self.assertIn("normalized artifact", handoff_text.lower())
        self.assertIn("reproducible", handoff_text.lower())
        self.assertIn("trust boundary", handoff_text.lower())

        workflow_text = (
            plugin_root / "skills" / "formal-verification-bridge" / "workflows" / "export-review.md"
        ).read_text()
        self.assertIn("tool availability", workflow_text.lower())
        self.assertIn("export", workflow_text.lower())
        self.assertIn("crypto-fp-check", workflow_text.lower())

    def test_new_skills_and_extensions_have_required_files(self) -> None:
        # Layer 1: zk-circuit-auditor library pattern files
        zk_refs = (
            REPO_ROOT / "plugins" / "zk-and-vm-auditors"
            / "skills" / "zk-circuit-auditor" / "references"
        )
        for name in ["halo2-patterns.md", "arkworks-patterns.md", "plonky2-patterns.md"]:
            self.assertTrue((zk_refs / name).exists(), name)
        zk_skill_text = (
            REPO_ROOT / "plugins" / "zk-and-vm-auditors"
            / "skills" / "zk-circuit-auditor" / "SKILL.md"
        ).read_text()
        self.assertIn("If the codebase uses halo2, arkworks, or plonky2/3", zk_skill_text)

        # Layer 2: ethereum-crypto-auditor
        eth = (
            REPO_ROOT / "plugins" / "crypto-primitive-auditors"
            / "skills" / "ethereum-crypto-auditor"
        )
        self.assertTrue((eth / "SKILL.md").exists())
        for ref in ["ethereum-crypto-checklist.md", "finding-patterns.md"]:
            self.assertTrue((eth / "references" / ref).exists(), ref)
        for wf in ["secp256k1-ecdsa-review.md", "evm-precompile-review.md"]:
            self.assertTrue((eth / "workflows" / wf).exists(), wf)

        # Layer 3: folding-scheme-auditor
        fold = (
            REPO_ROOT / "plugins" / "zk-and-vm-auditors"
            / "skills" / "folding-scheme-auditor"
        )
        self.assertTrue((fold / "SKILL.md").exists())
        for ref in ["folding-scheme-checklist.md", "finding-patterns.md"]:
            self.assertTrue((fold / "references" / ref).exists(), ref)
        self.assertTrue((fold / "workflows" / "accumulator-review.md").exists())

        # Layer 4: side-channel-auditor zk-prover extension
        sc_refs = (
            REPO_ROOT / "plugins" / "implementation-safety"
            / "skills" / "side-channel-auditor" / "references"
        )
        self.assertTrue((sc_refs / "zk-prover-patterns.md").exists())
        sc_skill_text = (
            REPO_ROOT / "plugins" / "implementation-safety"
            / "skills" / "side-channel-auditor" / "SKILL.md"
        ).read_text()
        self.assertIn("If the codebase includes a ZK prover", sc_skill_text)
        self.assertIn("zk-prover-patterns.md", sc_skill_text)

    def test_routing_matrix_covers_new_skills(self) -> None:
        routing_text = (
            REPO_ROOT / "plugins" / "core-audit-flow" / "skills"
            / "crypto-audit-router" / "references" / "routing-matrix.md"
        ).read_text()
        self.assertIn("ethereum-crypto-auditor", routing_text)
        self.assertIn("folding-scheme-auditor", routing_text)


if __name__ == "__main__":
    unittest.main()
