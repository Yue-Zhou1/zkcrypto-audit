import unittest

from scripts.sync_codex_stubs import validate_registry


class SyncCodexStubsTests(unittest.TestCase):
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
