from __future__ import annotations

import os
from pathlib import Path


class PathGuardError(ValueError):
    """Raised when a requested session path is outside emu's write boundary."""


def write_text_atomic(path: Path, text: str) -> None:
    """Crash-safe single-file write: stage to a sibling .tmp, then rename.

    Shared by SessionStore (single session file) and InvestigationStore
    (sidecar files) so there is one atomic-write implementation, not two.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(path.name + ".tmp")
    temp_path.write_text(text)
    os.replace(temp_path, path)


def write_two_files_atomic(
    first_path: Path,
    first_text: str,
    second_path: Path,
    second_text: str,
) -> None:
    """Crash-safe two-file commit used by cross-file imports.

    Two explicit phases. Stage: write both .tmp (the only fallible step). Commit:
    rename into place, ``first_path`` last to lose. On a staging failure we delete
    only the .tmp files, never a live target. Once commit begins we do not run
    blanket cleanup, so a partially-committed rename cannot delete an
    already-committed target. ``first_path`` is renamed before ``second_path``,
    so the surviving partial state is "first written, second not" — recoverable.
    """
    first_tmp = first_path.with_name(first_path.name + ".tmp")
    second_tmp = second_path.with_name(second_path.name + ".tmp")
    first_path.parent.mkdir(parents=True, exist_ok=True)
    second_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        first_tmp.write_text(first_text)
        second_tmp.write_text(second_text)
    except BaseException:
        for tmp in (first_tmp, second_tmp):
            tmp.unlink(missing_ok=True)
        raise
    os.replace(first_tmp, first_path)
    os.replace(second_tmp, second_path)


def sessions_root(repo_root: Path) -> Path:
    return repo_root / "zk-findings" / "sessions"


def resolve_session_path(repo_root: Path, session_path: str) -> Path:
    base = sessions_root(repo_root).resolve()
    candidate = (base / session_path).resolve()

    try:
        relative = candidate.relative_to(base)
    except ValueError as exc:
        raise PathGuardError(f"session path escapes sessions root: {session_path}") from exc

    if candidate.suffix != ".json":
        raise PathGuardError(f"session path must point to a JSON file: {session_path}")

    blocked_parts = {"pocs", "reports"}
    if blocked_parts.intersection(relative.parts):
        raise PathGuardError(f"session path targets a non-session artifact directory: {session_path}")

    return candidate
