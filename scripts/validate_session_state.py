#!/usr/bin/env python3
"""Validate tracked engagement session files against session schema v2.

Every tracked ``zk-findings/sessions/**/*.json`` (except the schema file
itself) must satisfy ``session-state-schema.json`` version 2. Validation uses
``jsonschema.Draft202012Validator`` with a ``FormatChecker`` so ``date-time``
fields are enforced when the optional format library (``rfc3339-validator``) is
installed.

This validator is part of the opt-in session-schema-v2 track. If ``jsonschema``
is not installed it prints a clear skip message and exits 0 rather than crashing
on import, so environments that did not opt in are not broken. Install the track
dependencies with ``python3 -m pip install -r requirements-dev.txt``.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SESSIONS_DIR = REPO_ROOT / "zk-findings" / "sessions"
SCHEMA_PATH = SESSIONS_DIR / "session-state-schema.json"


def tracked_session_files() -> list[Path]:
    """Return every session JSON except the schema file itself."""

    return sorted(
        path
        for path in SESSIONS_DIR.rglob("*.json")
        if path.resolve() != SCHEMA_PATH.resolve()
    )


def validate_all() -> int:
    try:
        import jsonschema  # type: ignore
    except ModuleNotFoundError:
        print(
            "validate_session_state: jsonschema not installed; skipping "
            "(install with `python3 -m pip install -r requirements-dev.txt`).",
            file=sys.stderr,
        )
        return 0

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    format_checker = jsonschema.FormatChecker()
    validator = jsonschema.Draft202012Validator(schema, format_checker=format_checker)

    if "date-time" not in format_checker.checkers:
        print(
            "validate_session_state: WARNING date-time format is not enforced; "
            "install `rfc3339-validator` (see requirements-dev.txt).",
            file=sys.stderr,
        )

    session_files = tracked_session_files()
    all_errors: list[str] = []
    for path in session_files:
        document = json.loads(path.read_text(encoding="utf-8"))
        for error in sorted(validator.iter_errors(document), key=lambda e: list(e.path)):
            location = ".".join(str(part) for part in error.path) or "<root>"
            all_errors.append(
                f"{path.relative_to(REPO_ROOT).as_posix()}: {location}: {error.message}"
            )

    if all_errors:
        print("validate_session_state: validation failed", file=sys.stderr)
        for error in all_errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    print(f"validate_session_state: check passed for {len(session_files)} sessions")
    return 0


def main() -> int:
    return validate_all()


if __name__ == "__main__":
    raise SystemExit(main())
