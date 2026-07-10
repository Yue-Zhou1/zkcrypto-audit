"""Regression tests for registry-derived skill-count markers."""

from __future__ import annotations

from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts import sync_skill_counts


class SyncSkillCountsTests(unittest.TestCase):
    def test_check_detects_drift_and_sync_rewrites_all_markers(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            readme_path = root / "README.md"
            claude_path = root / "CLAUDE.md"
            readme_path.write_text(
                "plugins-7_categories%2F41_skills\ncovering 41 skills\n", encoding="utf-8"
            )
            claude_path.write_text("housing 41 audit skills\n", encoding="utf-8")

            with (
                patch.object(sync_skill_counts, "README_PATH", readme_path),
                patch.object(sync_skill_counts, "CLAUDE_PATH", claude_path),
                patch.object(sync_skill_counts, "expected_skill_count", return_value=42),
            ):
                stderr = StringIO()
                with redirect_stderr(stderr):
                    self.assertEqual(sync_skill_counts.sync_skill_counts(check_mode=True), 1)
                self.assertIn("Stale skill count", stderr.getvalue())

                self.assertEqual(sync_skill_counts.sync_skill_counts(check_mode=False), 0)
                self.assertEqual(sync_skill_counts.sync_skill_counts(check_mode=True), 0)

            self.assertIn("plugins-7_categories%2F42_skills", readme_path.read_text(encoding="utf-8"))
            self.assertIn("covering 42 skills", readme_path.read_text(encoding="utf-8"))
            self.assertIn("housing 42 audit skills", claude_path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
