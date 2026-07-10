"""Regression tests for the audit-skill scaffold generator."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from scripts.init_audit_skill import InitAuditSkillError, _fixture_dict, init_audit_skill
from scripts.validate_skill_evals import _validate_shape


class InitAuditSkillTests(unittest.TestCase):
    def test_fixture_matches_the_evaluation_schema_before_marker_validation(self) -> None:
        self.assertEqual(_validate_shape(_fixture_dict(skill_name="example-auditor")), [])

    def test_rejects_path_like_category_and_resource_names_before_writing(self) -> None:
        with TemporaryDirectory() as directory:
            repo_root = Path(directory)
            (repo_root / "plugins" / "implementation-safety").mkdir(parents=True)

            invalid_values = [
                {"category": "../outside", "checklist": "review.md", "workflow": "review.md"},
                {
                    "category": "implementation-safety",
                    "checklist": "../outside.md",
                    "workflow": "review.md",
                },
                {
                    "category": "implementation-safety",
                    "checklist": "review.md",
                    "workflow": "nested/review.md",
                },
            ]
            for values in invalid_values:
                with self.subTest(values=values):
                    with self.assertRaises(InitAuditSkillError):
                        init_audit_skill(
                            skill_name="example-auditor",
                            phase="domain",
                            trigger_mode="router_auto",
                            repo_root=repo_root,
                            **values,
                        )

            self.assertFalse((repo_root / "plugins" / "implementation-safety" / "skills").exists())
            self.assertFalse((repo_root / "outside").exists())


if __name__ == "__main__":
    unittest.main()
