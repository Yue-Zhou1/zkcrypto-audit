from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from emu.models.session import PatchOperation, PatchRequest
from emu.services.filesystem import FilesystemService, TargetPathError
from emu.services.investigation_store import (
    InvestigationStore,
    InvestigationStoreError,
    JsonlIntegrityError,
    PendingNotFoundError,
    QuestionConflictError,
    QuestionNotFoundError,
    SidecarPathError,
    WriteConflictError as InvestigationWriteConflictError,
)
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


class CreateQuestionPayload(BaseModel):
    base_mtime_ns: int
    text: str
    source_ref: str | None = None
    rationale: str | None = None
    routed_skill: str | None = None


class PatchQuestionPayload(BaseModel):
    base_mtime_ns: int
    updates: dict


class VerdictPayload(BaseModel):
    base_mtime_ns: int
    evidence: str
    verdict: str


class PromptQuestionPayload(BaseModel):
    chosen_skill: str | None = None


class RouteSuggestPayload(BaseModel):
    text: str


class BufferCandidatePayload(BaseModel):
    questions_mtime_ns: int
    pending_mtime_ns: int
    question_id: str
    proposed: dict[str, str] = Field(default_factory=dict)


class ImportPendingPayload(BaseModel):
    session_mtime_ns: int
    questions_mtime_ns: int
    pending_mtime_ns: int
    question_ids: list[str] = Field(default_factory=list)


def repo_root_from_backend() -> Path:
    return Path(__file__).resolve().parents[5]


def create_app(repo_root: Path | None = None) -> FastAPI:
    root = repo_root or repo_root_from_backend()
    store = SessionStore(root)
    investigations = InvestigationStore(root)
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

    @app.get("/api/sessions/{session_path:path}/questions")
    def list_questions(session_path: str) -> dict:
        try:
            return investigations.read_questions(session_path)
        except (SidecarPathError, JsonlIntegrityError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/sessions/{session_path:path}/questions", status_code=201)
    def create_question(session_path: str, payload: CreateQuestionPayload) -> dict:
        try:
            return investigations.create_question(
                session_path,
                payload.base_mtime_ns,
                payload.text,
                payload.source_ref,
                payload.rationale,
                payload.routed_skill,
            )
        except InvestigationWriteConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except (InvestigationStoreError, JsonlIntegrityError, SidecarPathError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.patch("/api/sessions/{session_path:path}/questions/{question_id}")
    def patch_question(session_path: str, question_id: str, payload: PatchQuestionPayload) -> dict:
        try:
            if "verdict" in payload.updates and "evidence" in payload.updates:
                return investigations.record_verdict(
                    session_path,
                    payload.base_mtime_ns,
                    question_id,
                    str(payload.updates.get("evidence") or ""),
                    str(payload.updates.get("verdict") or ""),
                )
            return investigations.update_question(session_path, payload.base_mtime_ns, question_id, payload.updates)
        except InvestigationWriteConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except (QuestionNotFoundError, JsonlIntegrityError, SidecarPathError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/sessions/{session_path:path}/questions/{question_id}/prompt")
    def question_prompt(session_path: str, question_id: str, payload: PromptQuestionPayload) -> dict:
        try:
            return investigations.regenerate_prompt(session_path, question_id, payload.chosen_skill)
        except (QuestionNotFoundError, SidecarPathError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/sessions/{session_path:path}/coverage/export")
    def coverage_export(session_path: str) -> dict:
        try:
            return {"markdown": investigations.coverage_markdown(session_path)}
        except (SidecarPathError, JsonlIntegrityError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/sessions/{session_path:path}/coverage")
    def coverage(session_path: str) -> dict:
        try:
            return investigations.coverage(session_path)
        except (SidecarPathError, JsonlIntegrityError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.get("/api/sessions/{session_path:path}/pending")
    def list_pending(session_path: str) -> dict:
        try:
            return investigations.read_pending(session_path)
        except (SidecarPathError, JsonlIntegrityError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/sessions/{session_path:path}/pending/import")
    def import_pending(session_path: str, payload: ImportPendingPayload) -> dict:
        try:
            return investigations.import_pending(
                session_path,
                payload.session_mtime_ns,
                payload.questions_mtime_ns,
                payload.pending_mtime_ns,
                payload.question_ids,
            )
        except InvestigationWriteConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except (PendingNotFoundError, QuestionNotFoundError, JsonlIntegrityError, SidecarPathError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/sessions/{session_path:path}/pending", status_code=201)
    def buffer_candidate(session_path: str, payload: BufferCandidatePayload) -> dict:
        try:
            return investigations.buffer_candidate(
                session_path,
                payload.questions_mtime_ns,
                payload.pending_mtime_ns,
                payload.question_id,
                payload.proposed,
            )
        except InvestigationWriteConflictError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except (QuestionConflictError, QuestionNotFoundError, JsonlIntegrityError, SidecarPathError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    @app.post("/api/routing/suggest")
    def suggest_route(payload: RouteSuggestPayload) -> dict:
        return investigations.suggest_routes(payload.text)

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
