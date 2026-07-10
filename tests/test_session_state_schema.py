"""Validate tracked engagement session files against session schema v2.

Every tracked `zk-findings/sessions/**/*.json` (except the schema itself) must
satisfy the version 2 core contract in `session-state-schema.json`. The schema
is loaded with `jsonschema.Draft202012Validator` and a `jsonschema.FormatChecker`
so `date-time` fields are enforced when the optional format library is present.

If `jsonschema` is not installed the whole module skips with a clear message
rather than crashing on import, matching the opt-in dependency policy for the
session-schema-v2 track.
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    import jsonschema  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - exercised only without the dep
    jsonschema = None

SESSIONS_DIR = REPO_ROOT / "zk-findings" / "sessions"
SCHEMA_PATH = SESSIONS_DIR / "session-state-schema.json"


def tracked_session_files() -> list[Path]:
    """Every session JSON except the schema file itself."""

    return sorted(
        path
        for path in SESSIONS_DIR.rglob("*.json")
        if path.resolve() != SCHEMA_PATH.resolve()
    )


@unittest.skipIf(jsonschema is None, "jsonschema not installed; session-schema track is opt-in")
class SessionStateSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        cls.format_checker = jsonschema.FormatChecker()
        cls.validator = jsonschema.Draft202012Validator(
            cls.schema, format_checker=cls.format_checker
        )

    def test_schema_declares_version_2(self) -> None:
        schema_version = self.schema.get("properties", {}).get("schema_version", {})
        self.assertEqual(
            schema_version.get("const"),
            2,
            "session schema must pin schema_version const to 2",
        )

    def test_schema_root_is_closed(self) -> None:
        self.assertFalse(
            self.schema.get("additionalProperties", True),
            "session schema root must keep additionalProperties: false",
        )

    def test_every_tracked_session_validates(self) -> None:
        session_files = tracked_session_files()
        self.assertTrue(session_files, "expected at least one tracked session file")

        for path in session_files:
            with self.subTest(session=path.relative_to(REPO_ROOT).as_posix()):
                document = json.loads(path.read_text(encoding="utf-8"))
                errors = sorted(
                    self.validator.iter_errors(document),
                    key=lambda error: list(error.path),
                )
                messages = [
                    f"{'.'.join(str(part) for part in error.path) or '<root>'}: {error.message}"
                    for error in errors
                ]
                self.assertEqual(messages, [], "\n".join(messages))

    def test_bad_date_time_is_rejected_when_format_library_present(self) -> None:
        if "date-time" not in self.format_checker.checkers:
            self.skipTest("date-time format library (rfc3339-validator) not installed")
        errors = list(
            self.validator.iter_errors(
                {
                    "schema_version": 2,
                    "engagement_id": "x",
                    "phase": "closed",
                    "targets": [],
                    "trust_boundaries": [],
                    "critical_paths": [],
                    "unresolved_assumptions": [],
                    "route_dispositions": [],
                    "open_findings": [],
                    "verified_findings": [],
                    "fp_check_verdicts": [],
                    "artifacts": {"reports": [], "pocs": [], "index_refs": []},
                    "remediation_verifications": [],
                    "next_steps": [],
                    "updated_at": "not-a-timestamp",
                    "extensions": {},
                }
            )
        )
        self.assertTrue(
            any("updated_at" in list(error.path) for error in errors),
            "a malformed updated_at must be rejected when date-time enforcement is active",
        )


if __name__ == "__main__":
    unittest.main()
