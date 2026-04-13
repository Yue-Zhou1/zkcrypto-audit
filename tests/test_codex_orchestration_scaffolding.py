import json
import re
import subprocess
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_PLUGIN_ORDER = [
    "core-audit-flow",
    "zk-and-vm-auditors",
    "crypto-primitive-auditors",
    "protocol-auditors",
    "post-quantum-auditors",
    "implementation-safety",
    "evidence-and-tooling",
]


def _load_registry_entries() -> list[dict[str, str]]:
    registry_path = REPO_ROOT / "plugins" / "_meta" / "codex-skill-registry.yaml"
    text = registry_path.read_text()

    in_skills = False
    entries: list[dict[str, str]] = []
    current: dict[str, str] | None = None

    item_re = re.compile(r"^\s{2}-\s+skill_name:\s*(.+?)\s*$")
    field_re = re.compile(r"^\s{4}([a-z_]+):\s*(.+?)\s*$")

    for line in text.splitlines():
        if not in_skills:
            if line.strip() == "skills:":
                in_skills = True
            continue

        if not line.strip():
            continue
        if re.match(r"^\S", line):
            break

        item_match = item_re.match(line)
        if item_match:
            if current is not None:
                entries.append(current)
            current = {"skill_name": item_match.group(1).strip()}
            continue

        field_match = field_re.match(line)
        if field_match and current is not None:
            current[field_match.group(1)] = field_match.group(2).strip()

    if current is not None:
        entries.append(current)

    return entries


def _load_router_auto_targets() -> set[str]:
    matrix_path = REPO_ROOT / "plugins" / "_meta" / "router-matrix.yaml"
    text = matrix_path.read_text()
    return set(re.findall(r"^ {6}- ([a-z0-9-]+)\s*$", text, flags=re.M))


def _load_user_triggered_exclusions() -> set[str]:
    matrix_path = REPO_ROOT / "plugins" / "_meta" / "router-matrix.yaml"
    text = matrix_path.read_text()
    match = re.search(
        r"user_triggered_only_exclusions:\n((?: {2}- [a-z0-9-]+\n)+)",
        text,
        flags=re.M,
    )
    if not match:
        return set()
    return set(re.findall(r"^ {2}- ([a-z0-9-]+)$", match.group(1), flags=re.M))


class CodexOrchestrationScaffoldingTests(unittest.TestCase):
    def test_codex_plugin_manifests_exist_for_all_category_plugins(self) -> None:
        manifest_paths = sorted((REPO_ROOT / "plugins").glob("*/.codex-plugin/plugin.json"))
        self.assertEqual(len(manifest_paths), 7)

        names = []
        for path in manifest_paths:
            manifest = json.loads(path.read_text())
            names.append(manifest["name"])
            self.assertIn("category", manifest)
            self.assertIn("version", manifest)
            self.assertIn("description", manifest)

        self.assertEqual(sorted(names), sorted(EXPECTED_PLUGIN_ORDER))

    def test_marketplace_matches_schema_contract_and_expected_order(self) -> None:
        schema = json.loads((REPO_ROOT / ".agents" / "plugins" / "marketplace.schema.json").read_text())
        marketplace = json.loads((REPO_ROOT / ".agents" / "plugins" / "marketplace.json").read_text())

        expected_schema_ref = schema["properties"]["$schema"]["const"]
        self.assertEqual(marketplace["$schema"], expected_schema_ref)

        for required_key in schema["required"]:
            self.assertIn(required_key, marketplace)

        plugins = marketplace["plugins"]
        self.assertEqual(len(plugins), len(EXPECTED_PLUGIN_ORDER))
        self.assertEqual([entry["name"] for entry in plugins], EXPECTED_PLUGIN_ORDER)

        base_required = schema["$defs"]["pluginEntry"]["required"]
        prefix_items = schema["properties"]["plugins"]["prefixItems"]

        for index, plugin in enumerate(plugins):
            for required_key in base_required:
                self.assertIn(required_key, plugin)

            ref_name = prefix_items[index]["$ref"].split("/")[-1]
            const_props = schema["$defs"][ref_name]["allOf"][1]["properties"]
            for key, rules in const_props.items():
                if "const" in rules:
                    self.assertEqual(plugin[key], rules["const"])

            self.assertIn("routing", plugin["policy"])
            self.assertIn("user_triggered_only_enforced", plugin["policy"])

    def test_all_skills_have_openai_ui_metadata(self) -> None:
        skill_paths = sorted((REPO_ROOT / "plugins").glob("*/skills/*/SKILL.md"))
        self.assertEqual(len(skill_paths), 31)

        for skill_path in skill_paths:
            metadata_path = skill_path.parent / "agents" / "openai.yaml"
            self.assertTrue(metadata_path.exists(), metadata_path.as_posix())
            text = metadata_path.read_text()
            self.assertIn("display_name:", text, metadata_path.as_posix())
            self.assertIn("short_description:", text, metadata_path.as_posix())
            self.assertIn("default_prompt:", text, metadata_path.as_posix())

    def test_registry_references_resolve_to_real_files(self) -> None:
        entries = _load_registry_entries()
        self.assertEqual(len(entries), 31)

        expected_fields = {
            "skill_name",
            "plugin_category",
            "canonical_path",
            "phase",
            "trigger_mode",
        }
        for entry in entries:
            self.assertEqual(set(entry.keys()), expected_fields)
            canonical_path = REPO_ROOT / entry["canonical_path"]
            self.assertTrue(canonical_path.exists(), canonical_path.as_posix())

    def test_router_matrix_targets_resolve_to_registry_skills(self) -> None:
        entries = _load_registry_entries()
        registry_skill_names = {entry["skill_name"] for entry in entries}

        auto_route_targets = _load_router_auto_targets()
        self.assertTrue(auto_route_targets)

        missing = sorted(auto_route_targets - registry_skill_names)
        self.assertEqual(
            missing,
            [],
            f"router-matrix route_to targets missing from registry: {missing}",
        )

    def test_generated_codex_stubs_are_in_sync(self) -> None:
        result = subprocess.run(
            ["python3", "scripts/sync_codex_stubs.py", "--check"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            self.fail(
                "sync_codex_stubs --check failed\n"
                f"stdout:\n{result.stdout}\n"
                f"stderr:\n{result.stderr}"
            )

    def test_user_triggered_only_skills_are_excluded_from_auto_routes(self) -> None:
        entries = _load_registry_entries()
        user_triggered = {
            entry["skill_name"] for entry in entries if entry["trigger_mode"] == "user_triggered_only"
        }
        self.assertTrue(user_triggered)

        auto_route_targets = _load_router_auto_targets()
        self.assertTrue(auto_route_targets)

        overlap = sorted(user_triggered.intersection(auto_route_targets))
        self.assertEqual(
            overlap,
            [],
            f"user-triggered-only skills must not appear in router auto-route targets: {overlap}",
        )

        exclusions = _load_user_triggered_exclusions()
        self.assertEqual(exclusions, user_triggered)

    def test_user_triggered_only_skills_are_marked_in_openai_metadata(self) -> None:
        entries = _load_registry_entries()
        user_triggered_entries = [entry for entry in entries if entry["trigger_mode"] == "user_triggered_only"]
        self.assertTrue(user_triggered_entries)

        for entry in user_triggered_entries:
            canonical_path = REPO_ROOT / entry["canonical_path"]
            metadata_path = canonical_path.parent / "agents" / "openai.yaml"
            self.assertTrue(metadata_path.exists(), metadata_path.as_posix())

            metadata_text = metadata_path.read_text().lower()
            normalized = metadata_text.replace("—", "-").replace("–", "-")
            self.assertIn(
                "user-triggered only",
                normalized,
                f"`{entry['skill_name']}` metadata must mark user-triggered-only status",
            )

    def test_formal_verification_bridge_metadata_mentions_external_tooling_prereq(self) -> None:
        metadata_path = (
            REPO_ROOT
            / "plugins"
            / "evidence-and-tooling"
            / "skills"
            / "formal-verification-bridge"
            / "agents"
            / "openai.yaml"
        )
        text = metadata_path.read_text().lower()
        self.assertIn("external formal-verification tooling", text)
        self.assertRegex(text, r"(requires|required).*(installed|configured)")

    def test_router_reference_index_links_state_machine(self) -> None:
        router_skill = (
            REPO_ROOT
            / "plugins"
            / "core-audit-flow"
            / "skills"
            / "crypto-audit-router"
            / "SKILL.md"
        ).read_text()
        self.assertIn("references/state-machine.md", router_skill)

        full_flow = (
            REPO_ROOT
            / "plugins"
            / "core-audit-flow"
            / "skills"
            / "crypto-audit-router"
            / "workflows"
            / "full-audit-flow.md"
        ).read_text()
        self.assertIn("../references/state-machine.md", full_flow)


if __name__ == "__main__":
    unittest.main()
