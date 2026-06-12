from __future__ import annotations

from pathlib import Path


class PathGuardError(ValueError):
    """Raised when a requested session path is outside emu's write boundary."""


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
