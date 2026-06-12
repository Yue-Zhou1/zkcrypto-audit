from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml


class MetadataError(RuntimeError):
    """Raised when emu cannot read routing metadata."""


class MetadataService:
    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root

    def load_routes(self) -> dict[str, Any]:
        path = self.repo_root / "plugins" / "_meta" / "router-matrix.yaml"
        return self._load_yaml(path)

    def load_skills(self) -> dict[str, Any]:
        path = self.repo_root / "plugins" / "_meta" / "codex-skill-registry.yaml"
        return self._load_yaml(path)

    def phase_flow(self) -> list[dict[str, Any]]:
        routes = self.load_routes()
        phase_flow = routes.get("phase_flow", [])
        if isinstance(phase_flow, list):
            return [item for item in phase_flow if isinstance(item, dict)]
        return []

    def default_skill_for_phase(self, phase: str) -> str | None:
        for item in self.phase_flow():
            if item.get("phase") == phase:
                skill = item.get("default_skill")
                return skill if isinstance(skill, str) else None
        return None

    def _load_yaml(self, path: Path) -> dict[str, Any]:
        try:
            data = yaml.safe_load(path.read_text())
        except OSError as exc:
            raise MetadataError(f"metadata file not readable: {path}") from exc
        except yaml.YAMLError as exc:
            raise MetadataError(f"metadata file is invalid YAML: {path}") from exc

        if not isinstance(data, dict):
            raise MetadataError(f"metadata file is not a YAML mapping: {path}")
        return data
