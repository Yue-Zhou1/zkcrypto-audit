from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from emu.core.paths import PathGuardError, resolve_session_path, sessions_root
from emu.models.session import PatchOperation, PatchRequest
from emu.services.derived import DerivedSessionService
from emu.services.metadata import MetadataService


class SessionStoreError(RuntimeError):
    """Base error for session store failures."""


class SessionNotFoundError(SessionStoreError):
    """Raised when a requested session file does not exist."""


class InvalidSessionError(SessionStoreError):
    """Raised when a write target does not parse as session JSON."""


class FindingNotFoundError(SessionStoreError):
    """Raised when a patch operation names a missing finding."""


class FindingConflictError(SessionStoreError):
    """Raised when add_finding would introduce a duplicate finding id."""


class WriteConflictError(SessionStoreError):
    """Raised when a session changed after the caller loaded it."""


class UnsupportedPatchOperationError(SessionStoreError):
    """Raised when a patch request contains an unsupported operation."""


class PatchIndexError(SessionStoreError):
    """Raised when a patch operation targets an out-of-range list index."""


class SessionStore:
    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root
        self.sessions_root = sessions_root(repo_root)
        self.metadata = MetadataService(repo_root)
        self.derived = DerivedSessionService(repo_root, self.metadata)

    def list_sessions(self) -> list[dict[str, Any]]:
        if not self.sessions_root.exists():
            return []

        sessions = []
        for path in sorted(self.sessions_root.rglob("*.json")):
            if path.name == "session-state-schema.json":
                continue
            if {"pocs", "reports"}.intersection(path.relative_to(self.sessions_root).parts):
                continue

            try:
                data = json.loads(path.read_text())
            except json.JSONDecodeError:
                continue
            if not isinstance(data, dict) or not isinstance(data.get("engagement_id"), str):
                continue

            relative = path.relative_to(self.sessions_root).as_posix()
            open_findings = self._finding_list(data, "open_findings")
            verified_findings = self._finding_list(data, "verified_findings")
            sessions.append(
                {
                    "session_path": relative,
                    "engagement_id": data["engagement_id"],
                    "phase": self.derived.current_phase(data),
                    "updated_at": data.get("updated_at"),
                    "mtime_ns": path.stat().st_mtime_ns,
                    "targets_count": self._count_targets(data),
                    "open_findings_count": len(open_findings),
                    "verified_findings_count": len(verified_findings),
                }
            )

        return sessions

    def read_session(self, session_path: str) -> dict[str, Any]:
        path = resolve_session_path(self.repo_root, session_path)
        if not path.exists():
            raise SessionNotFoundError(f"session file not found: {session_path}")

        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            return {
                "session_path": session_path,
                "session": None,
                "mtime_ns": path.stat().st_mtime_ns,
                "diagnostics": {
                    "valid": False,
                    "errors": [{"path": "", "message": f"Invalid JSON: {exc.msg}"}],
                },
                "derived": {},
            }

        if not isinstance(data, dict):
            raise InvalidSessionError(f"session JSON root must be an object: {session_path}")

        diagnostics = self.validate_session(data)
        gates = self.derived.evidence_gates(data, diagnostics, path)
        next_action = self.derived.next_action(session_path, data, gates)
        return {
            "session_path": session_path,
            "session": data,
            "mtime_ns": path.stat().st_mtime_ns,
            "diagnostics": diagnostics,
            "derived": {
                "phase": self.derived.current_phase(data),
                "finding_groups": self.derived.finding_groups(data),
                "finding_dispositions": self.derived.finding_dispositions(data),
                "evidence_gates": gates,
                "next_action": next_action,
            },
        }

    def create_session(
        self,
        engagement_id: str,
        engagement_dir: str | None = None,
        first_target: str | None = None,
    ) -> dict[str, Any]:
        clean_engagement_id = engagement_id.strip()
        if not clean_engagement_id:
            raise InvalidSessionError("engagement_id is required")

        directory = engagement_dir.strip() if engagement_dir else clean_engagement_id
        path = resolve_session_path(self.repo_root, f"{directory}/{clean_engagement_id}.json")
        if path.exists():
            raise WriteConflictError(f"session already exists: {path.relative_to(self.sessions_root).as_posix()}")

        data = {
            "engagement_id": clean_engagement_id,
            "targets": [first_target] if first_target else [],
            "trust_boundaries": [],
            "open_findings": [],
            "verified_findings": [],
            "next_steps": ["Run crypto-audit-context to capture target scope and trust boundaries."],
            "updated_at": self._utc_now_iso(),
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        self._write_session_file(path, data)
        return self.read_session(path.relative_to(self.sessions_root).as_posix())

    def validate_session(self, data: dict[str, Any]) -> dict[str, Any]:
        schema_path = self.sessions_root / "session-state-schema.json"
        try:
            schema = json.loads(schema_path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            return {
                "valid": False,
                "errors": [{"path": "", "message": f"Schema unavailable: {exc}"}],
            }

        validator = Draft202012Validator(schema)
        errors = []
        for error in sorted(validator.iter_errors(data), key=lambda item: list(item.path)):
            path = ".".join(str(part) for part in error.path)
            errors.append({"path": path, "message": error.message})
        return {"valid": not errors, "errors": errors}

    def patch_session(self, session_path: str, request: PatchRequest) -> dict[str, Any]:
        path = resolve_session_path(self.repo_root, session_path)
        if not path.exists():
            raise SessionNotFoundError(f"session file not found: {session_path}")

        current_mtime_ns = path.stat().st_mtime_ns
        if request.base_mtime_ns != current_mtime_ns:
            raise WriteConflictError(f"session changed since load: {session_path}")

        data = self._load_session_for_write(path)
        for operation in request.operations:
            self._apply_operation(data, operation)
        data["updated_at"] = self._utc_now_iso()

        self._write_session_file(path, data)
        return self.read_session(session_path)

    def _utc_now_iso(self) -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    def _write_session_file(self, path: Path, data: dict[str, Any]) -> None:
        # Session files are audit handoff artifacts: write to a sibling temp
        # file and replace atomically so a crash cannot truncate them.
        temp_path = path.with_name(path.name + ".tmp")
        temp_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
        os.replace(temp_path, path)

    def _load_session_for_write(self, path: Path) -> dict[str, Any]:
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            raise InvalidSessionError(f"invalid session JSON: {path}") from exc

        if not isinstance(data, dict) or not isinstance(data.get("engagement_id"), str):
            raise InvalidSessionError(f"write target is not session state JSON: {path}")

        return data

    def _apply_operation(self, data: dict[str, Any], operation: PatchOperation) -> None:
        if operation.kind == "update_finding_status":
            self._patch_finding_field(data, operation, "status", operation.status)
            return

        if operation.kind == "update_finding_summary":
            self._patch_finding_field(data, operation, "summary", operation.summary)
            return

        if operation.kind == "append_next_step":
            if not operation.text:
                raise UnsupportedPatchOperationError("append_next_step requires non-empty text")
            self._mutable_list(data, "next_steps").append(operation.text)
            return

        if operation.kind == "add_target":
            if not operation.value:
                raise UnsupportedPatchOperationError("add_target requires value")
            self._mutable_list(data, "targets").append(operation.value)
            return

        if operation.kind == "edit_target":
            if not operation.value:
                raise UnsupportedPatchOperationError("edit_target requires value")
            targets = self._mutable_list(data, "targets")
            targets[self._checked_index(targets, operation.index, "edit_target")] = operation.value
            return

        if operation.kind == "remove_target":
            targets = self._mutable_list(data, "targets")
            del targets[self._checked_index(targets, operation.index, "remove_target")]
            return

        if operation.kind == "add_trust_boundary":
            if not operation.boundary or not operation.boundary.get("name"):
                raise UnsupportedPatchOperationError("add_trust_boundary requires boundary with name")
            self._mutable_list(data, "trust_boundaries").append(dict(operation.boundary))
            return

        if operation.kind == "edit_trust_boundary":
            if not operation.boundary:
                raise UnsupportedPatchOperationError("edit_trust_boundary requires boundary")
            boundaries = self._mutable_list(data, "trust_boundaries")
            idx = self._checked_index(boundaries, operation.index, "edit_trust_boundary")
            current = boundaries[idx]
            if not isinstance(current, dict):
                raise InvalidSessionError("trust boundary entry is not an object")
            current.update(operation.boundary)
            return

        if operation.kind == "remove_trust_boundary":
            boundaries = self._mutable_list(data, "trust_boundaries")
            del boundaries[self._checked_index(boundaries, operation.index, "remove_trust_boundary")]
            return

        if operation.kind == "edit_next_step":
            if not operation.value:
                raise UnsupportedPatchOperationError("edit_next_step requires value")
            steps = self._mutable_list(data, "next_steps")
            steps[self._checked_index(steps, operation.index, "edit_next_step")] = operation.value
            return

        if operation.kind == "remove_next_step":
            steps = self._mutable_list(data, "next_steps")
            del steps[self._checked_index(steps, operation.index, "remove_next_step")]
            return

        if operation.kind == "reorder_next_steps":
            steps = self._mutable_list(data, "next_steps")
            order = operation.order or []
            if sorted(order) != list(range(len(steps))):
                raise PatchIndexError(f"reorder_next_steps order {order} is not a permutation of 0..{len(steps) - 1}")
            data["next_steps"] = [steps[i] for i in order]
            return

        if operation.kind == "add_finding":
            finding = operation.finding or {}
            finding_id = finding.get("id")
            if not finding_id:
                raise UnsupportedPatchOperationError("add_finding requires finding with id")
            if self._finding_id_exists(data, finding_id):
                raise FindingConflictError(f"finding id already exists: {finding_id}")
            self._mutable_list(data, "open_findings").append(dict(finding))
            return

        if operation.kind == "remove_finding":
            if not operation.finding_id:
                raise UnsupportedPatchOperationError("remove_finding requires finding_id")
            findings = self._mutable_list(data, "open_findings")
            for i, item in enumerate(findings):
                if isinstance(item, dict) and item.get("id") == operation.finding_id:
                    del findings[i]
                    return
            raise FindingNotFoundError(f"finding not found: {operation.finding_id}")

        raise UnsupportedPatchOperationError(f"unsupported patch operation: {operation.kind}")

    def _patch_finding_field(
        self,
        data: dict[str, Any],
        operation: PatchOperation,
        field_name: str,
        value: str | None,
    ) -> None:
        if not operation.finding_id:
            raise UnsupportedPatchOperationError(f"{operation.kind} requires finding_id")
        if value is None:
            raise UnsupportedPatchOperationError(f"{operation.kind} requires {field_name}")

        finding = self._find_finding(data, operation.finding_id)
        finding[field_name] = value

    def _find_finding(self, data: dict[str, Any], finding_id: str) -> dict[str, Any]:
        for collection_name in ("open_findings", "verified_findings"):
            collection = data.get(collection_name, [])
            if not isinstance(collection, list):
                continue
            for item in collection:
                if isinstance(item, dict) and item.get("id") == finding_id:
                    return item
        raise FindingNotFoundError(f"finding not found: {finding_id}")

    def _finding_id_exists(self, data: dict[str, Any], finding_id: str) -> bool:
        for collection_name in ("open_findings", "verified_findings"):
            for item in self._finding_list(data, collection_name):
                if item.get("id") == finding_id:
                    return True
        return False

    def _mutable_list(self, data: dict[str, Any], key: str) -> list[Any]:
        value = data.setdefault(key, [])
        if not isinstance(value, list):
            raise InvalidSessionError(f"{key} must be a list")
        return value

    def _checked_index(self, items: list[Any], index: int | None, kind: str) -> int:
        if index is None:
            raise UnsupportedPatchOperationError(f"{kind} requires index")
        if index < 0 or index >= len(items):
            raise PatchIndexError(f"{kind} index {index} out of range (len {len(items)})")
        return index

    def _finding_list(self, data: dict[str, Any], key: str) -> list[dict[str, Any]]:
        value = data.get(key, [])
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]

    def _count_targets(self, data: dict[str, Any]) -> int:
        for key in ("targets", "target", "target_scope", "scope"):
            value = data.get(key)
            if isinstance(value, list):
                return len(value)
            if isinstance(value, str):
                return 1
        return 0


__all__ = [
    "FindingConflictError",
    "FindingNotFoundError",
    "InvalidSessionError",
    "PatchIndexError",
    "PathGuardError",
    "SessionNotFoundError",
    "SessionStore",
    "UnsupportedPatchOperationError",
    "WriteConflictError",
]
