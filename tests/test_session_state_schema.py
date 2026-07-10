"""Validate tracked engagement session files against session schema v2.

Every tracked `zk-findings/sessions/**/*.json` (except the schema itself) must
satisfy the version 2 core contract in `session-state-schema.json`. The schema
is loaded with `jsonschema.Draft202012Validator` when that optional package is
available. Timestamp fields are strings; this track does not enforce a date
format.

If `jsonschema` is not installed, both the tests and CLI validator skip the
optional session-schema check with a clear message.
"""

from __future__ import annotations

import json
import os
import subprocess
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


@unittest.skipIf(jsonschema is None, "jsonschema not installed; session-schema validation is optional")
class SessionStateSchemaTests(unittest.TestCase):
    def test_validator_skips_when_jsonschema_is_unavailable(self) -> None:
        result = subprocess.run(
            [sys.executable, "-S", "scripts/validate_session_state.py"],
            cwd=REPO_ROOT,
            capture_output=True,
            env={key: value for key, value in os.environ.items() if key != "PYTHONPATH"},
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("skipping", result.stderr)

    @classmethod
    def setUpClass(cls) -> None:
        cls.schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        cls.validator = jsonschema.Draft202012Validator(cls.schema)

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

    def test_schema_does_not_enforce_timestamp_format(self) -> None:
        root_timestamp = self.schema["properties"]["updated_at"]
        remediation_timestamp = self.schema["properties"]["remediation_verifications"]["items"][
            "properties"
        ]["verified_at"]

        self.assertNotIn("format", root_timestamp)
        self.assertNotIn("format", remediation_timestamp)


if __name__ == "__main__":
    unittest.main()
