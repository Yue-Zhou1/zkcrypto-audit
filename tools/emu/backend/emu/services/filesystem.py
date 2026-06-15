from __future__ import annotations

from pathlib import Path
from typing import Any


class TargetPathError(ValueError):
    """Raised when a target path is missing, not absolute, or not a directory."""


class FilesystemService:
    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root.resolve()

    def validate_target(self, raw_path: str) -> dict[str, Any]:
        candidate = Path(raw_path)
        if not candidate.is_absolute():
            raise TargetPathError(f"target path must be absolute: {raw_path}")

        resolved = candidate.resolve()
        if not resolved.exists():
            raise TargetPathError(f"target path does not exist: {raw_path}")
        if not resolved.is_dir():
            raise TargetPathError(f"target path is not a directory: {raw_path}")

        return {
            "path": str(resolved),
            "in_repo": self._is_in_repo(resolved),
            "looks_like_rust": self._looks_like_rust(resolved),
        }

    def _is_in_repo(self, resolved: Path) -> bool:
        try:
            resolved.relative_to(self.repo_root)
            return True
        except ValueError:
            return False

    def _looks_like_rust(self, resolved: Path) -> bool:
        # A target may be a crate root or a subdirectory inside a workspace
        # (crates/foo/, packages/bar/src/, ...), so walk up to a bounded number
        # of ancestors looking for a Cargo.toml rather than only the directory
        # itself and its immediate parent.
        max_ancestors = 6
        current = resolved
        for _ in range(max_ancestors + 1):
            if (current / "Cargo.toml").is_file():
                return True
            if current.parent == current:
                break
            current = current.parent
        return False
