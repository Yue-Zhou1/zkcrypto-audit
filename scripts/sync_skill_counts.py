#!/usr/bin/env python3
"""Synchronize registry-derived skill-count markers in README.md and CLAUDE.md."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.orchestration_metadata import expected_skill_count  # noqa: E402


README_PATH = REPO_ROOT / "README.md"
CLAUDE_PATH = REPO_ROOT / "CLAUDE.md"

# Each marker matches the exact literal-count substring; group(1) is the
# numeric count to replace in place.
README_MARKERS = [
    re.compile(r"plugins-7_categories%2F(\d+)_skills"),
    re.compile(r"covering (\d+) skills"),
]
CLAUDE_MARKERS = [
    re.compile(r"housing (\d+) audit skills"),
]


def _display_path(path: Path) -> str:
    try:
        return path.relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def _sync_file_markers(
    *, path: Path, markers: list[re.Pattern[str]], count: int, check_mode: bool, errors: list[str]
) -> str:
    text = path.read_text(encoding="utf-8")
    expected_value = str(count)

    for pattern in markers:
        match = pattern.search(text)
        if not match:
            errors.append(f"Marker `{pattern.pattern}` not found in {_display_path(path)}")
            continue

        current_value = match.group(1)
        if current_value == expected_value:
            continue

        if check_mode:
            errors.append(
                f"Stale skill count in {_display_path(path)}: "
                f"found {current_value}, expected {expected_value} (pattern `{pattern.pattern}`)"
            )
            continue

        start, end = match.span(1)
        text = text[:start] + expected_value + text[end:]

    return text


def sync_skill_counts(*, check_mode: bool) -> int:
    count = expected_skill_count()
    errors: list[str] = []

    updated_readme_text = _sync_file_markers(
        path=README_PATH, markers=README_MARKERS, count=count, check_mode=check_mode, errors=errors
    )
    updated_claude_text = _sync_file_markers(
        path=CLAUDE_PATH, markers=CLAUDE_MARKERS, count=count, check_mode=check_mode, errors=errors
    )

    if errors:
        print("sync_skill_counts: validation failed", file=sys.stderr)
        for error in errors:
            print(f" - {error}", file=sys.stderr)
        return 1

    if not check_mode:
        README_PATH.write_text(updated_readme_text, encoding="utf-8")
        CLAUDE_PATH.write_text(updated_claude_text, encoding="utf-8")
        print(f"sync_skill_counts: synchronized markers to {count} skills")
    else:
        print(f"sync_skill_counts: check passed for {count} skills")

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update or verify README/CLAUDE skill-count markers against the registry."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Validate markers instead of writing files.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return sync_skill_counts(check_mode=args.check)


if __name__ == "__main__":
    raise SystemExit(main())
