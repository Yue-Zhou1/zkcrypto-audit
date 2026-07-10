import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.sync_codex_stubs import sync_stubs, validate_registry
from scripts.orchestration_metadata import validate_router_reachability


class SyncCodexStubsTests(unittest.TestCase):
    def test_sync_stubs_check_mode_passes_on_current_repository_state(self) -> None:
        exit_code = sync_stubs(check_mode=True)
        self.assertEqual(exit_code, 0)

    def test_unreachable_router_auto_skill_fails_reachability_validation(self) -> None:
        skills = [
            {
                "skill_name": "orphan-auditor",
                "plugin_category": "implementation-safety",
                "canonical_path": "plugins/implementation-safety/skills/rust-crypto-safety/SKILL.md",
                "phase": "domain",
                "trigger_mode": "router_auto",
            },
        ]
        router_matrix = {
            "phase_flow": [{"phase": "domain", "default_skill": "spec-delta-checker"}],
            "routing_rules": [],
        }

        errors = validate_router_reachability(skills, router_matrix)
        self.assertTrue(
            any("orphan-auditor" in error and "unreachable" in error for error in errors), errors
        )

    def test_validate_registry_excludes_entries_with_invalid_phase_or_trigger_mode(self) -> None:
        registry = {
            "skills": [
                {
                    "skill_name": "valid-skill",
                    "plugin_category": "core-audit-flow",
                    "canonical_path": "plugins/core-audit-flow/skills/crypto-audit-context/SKILL.md",
                    "phase": "intake",
                    "trigger_mode": "router_auto",
                },
                {
                    "skill_name": "bad-phase",
                    "plugin_category": "core-audit-flow",
                    "canonical_path": "plugins/core-audit-flow/skills/crypto-audit-context/SKILL.md",
                    "phase": "bad",
                    "trigger_mode": "router_auto",
                },
                {
                    "skill_name": "bad-trigger",
                    "plugin_category": "core-audit-flow",
                    "canonical_path": "plugins/core-audit-flow/skills/crypto-audit-context/SKILL.md",
                    "phase": "intake",
                    "trigger_mode": "bad",
                },
            ]
        }

        skills, errors = validate_registry(registry)

        self.assertIn("invalid phase", "\n".join(errors))
        self.assertIn("invalid trigger_mode", "\n".join(errors))
        self.assertEqual([entry["skill_name"] for entry in skills], ["valid-skill"])


if __name__ == "__main__":
    unittest.main()
