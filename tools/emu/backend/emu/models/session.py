from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class PatchOperation:
    kind: str
    finding_id: str | None = None
    status: str | None = None
    summary: str | None = None
    text: str | None = None
    index: int | None = None
    value: str | None = None
    boundary: dict[str, str] | None = None
    finding: dict[str, str] | None = None
    order: list[int] | None = None


@dataclass(frozen=True)
class PatchRequest:
    base_mtime_ns: int
    operations: list[PatchOperation] = field(default_factory=list)
