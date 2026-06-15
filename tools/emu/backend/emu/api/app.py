from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from emu.models.session import PatchOperation, PatchRequest
from emu.services.filesystem import FilesystemService, TargetPathError
from emu.services.metadata import MetadataError, MetadataService
from emu.services.session_store import (
    FindingConflictError,
    FindingNotFoundError,
    InvalidSessionError,
    PatchIndexError,
    PathGuardError,
    SessionNotFoundError,
    SessionStore,
    UnsupportedPatchOperationError,
    WriteConflictError,
)


class PatchOperationPayload(BaseModel):
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


class PatchSessionPayload(BaseModel):
    base_mtime_ns: int
    operations: list[PatchOperationPayload] = Field(default_factory=list)


class CreateSessionPayload(BaseModel):
    engagement_id: str
    engagement_dir: str | None = None
    first_target: str | None = None


class ValidateTargetPayload(BaseModel):
    path: str


def repo_root_from_backend() -> Path:
    return Path(__file__).resolve().parents[5]


def create_app(repo_root: Path | None = None) -> FastAPI:
    root = repo_root or repo_root_from_backend()
    store = SessionStore(root)
    metadata = MetadataService(root)
    filesystem = FilesystemService(root)
    app = FastAPI(title="emu", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/sessions")
    def list_sessions() -> dict:
        return {"sessions": store.list_sessions()}

    # Registered before the generic session route: the greedy {session_path:path}
    # converter would otherwise swallow the /next-action suffix.
    @app.get("/api/sessions/{session_path:path}/next-action")
    def next_action(session_path: str) -> dict:
        action = read_session(session_path).get("derived", {}).get("next_action")
        if action is None:
            raise HTTPException(status_code=422, detail="session JSON is invalid; next action unavailable")
        return action

    @app.get("/api/sessions/{session_path:path}")
    def read_session(session_path: str) -> dict:
        try:
            return store.read_session(session_path)
        except SessionNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except (PathGuardError, InvalidSessionError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/sessions", status_code=201)
    def create_session(payload: CreateSessionPayload) -> dict:
        try:
            return store.create_session(payload.engagement_id, payload.engagement_dir, payload.first_target)
        except (PathGuardError, InvalidSessionError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except WriteConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

    @app.post("/api/fs/validate")
    def validate_target(payload: ValidateTargetPayload) -> dict:
        try:
            return filesystem.validate_target(payload.path)
        except TargetPathError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.patch("/api/sessions/{session_path:path}")
    def patch_session(session_path: str, payload: PatchSessionPayload) -> dict:
        request = PatchRequest(
            base_mtime_ns=payload.base_mtime_ns,
            operations=[
                PatchOperation(
                    kind=item.kind,
                    finding_id=item.finding_id,
                    status=item.status,
                    summary=item.summary,
                    text=item.text,
                    index=item.index,
                    value=item.value,
                    boundary=item.boundary,
                    finding=item.finding,
                    order=item.order,
                )
                for item in payload.operations
            ],
        )
        try:
            return store.patch_session(session_path, request)
        except SessionNotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except WriteConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except (
            FindingConflictError,
            FindingNotFoundError,
            InvalidSessionError,
            PatchIndexError,
            PathGuardError,
            UnsupportedPatchOperationError,
        ) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/metadata/skills")
    def skills() -> dict:
        try:
            return metadata.load_skills()
        except MetadataError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @app.get("/api/metadata/routes")
    def routes() -> dict:
        try:
            return metadata.load_routes()
        except MetadataError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    return app


app = create_app()
