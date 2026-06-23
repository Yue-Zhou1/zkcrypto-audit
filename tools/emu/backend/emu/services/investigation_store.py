from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from emu.core.paths import (
    PathGuardError,
    resolve_session_path,
    sessions_root,
    write_text_atomic,
    write_two_files_atomic,
)
from emu.services.metadata import MetadataError, MetadataService
from emu.services.prompt_builder import PromptBuilder


class InvestigationStoreError(RuntimeError):
    """Base error for investigation sidecar failures."""


class SidecarPathError(InvestigationStoreError):
    """Raised when a sidecar cannot be safely tied to a real session file."""


class JsonlIntegrityError(InvestigationStoreError):
    """Raised when a JSONL write would risk dropping malformed audit trail lines."""


class WriteConflictError(InvestigationStoreError):
    """Raised when a sidecar or session file changed since load."""


class QuestionNotFoundError(InvestigationStoreError):
    """Raised when a question id cannot be found."""


class QuestionConflictError(InvestigationStoreError):
    """Raised when an operation would duplicate a question or pending record."""


class PendingNotFoundError(InvestigationStoreError):
    """Raised when a pending candidate cannot be found."""


SYNONYMS = {
    "proof": {"witness", "transcript"},
    "witness": {"proof"},
    "transcript": {"proof", "challenge", "fiat", "shamir"},
    "forge": {"forgery", "soundness"},
    "forgery": {"forge", "soundness"},
    "bind": {"binding", "commit", "commitment"},
    "commit": {"bind", "binding", "commitment"},
    "nonce": {"randomness", "replay"},
    "subgroup": {"curve", "point"},
}


class InvestigationStore:
    def __init__(self, repo_root: Path) -> None:
        self.repo_root = repo_root
        self.sessions_root = sessions_root(repo_root)
        self.metadata = MetadataService(repo_root)
        self.prompts = PromptBuilder()

    def read_questions(self, session_path: str) -> dict[str, Any]:
        session_file = self._session_file(session_path)
        path = self._sidecar_path(session_file, "questions")
        detail = self._read_sidecar(path)
        # Recovery diagnostic (design §5.B): a question whose finding_ref does not
        # resolve to a finding in the session is a partial-import remnant. The
        # board reads questions, so the advisory must live here, not only in
        # read_pending — otherwise an in-session card would look imported.
        findings = self._finding_ids(self._load_session(session_file))
        for record in detail["records"]:
            finding_ref = record.get("finding_ref")
            if finding_ref and finding_ref not in findings:
                detail["diagnostics"].append(
                    {
                        "line": None,
                        "message": f"question {record.get('id')} links to missing finding {finding_ref}; re-import to repair",
                    }
                )
        return detail

    def create_question(
        self,
        session_path: str,
        base_mtime_ns: int,
        text: str,
        source_ref: str | None = None,
        rationale: str | None = None,
        routed_skill: str | None = None,
    ) -> dict[str, Any]:
        session = self._load_session(self._session_file(session_path))
        path = self._sidecar_path(self._session_file(session_path), "questions")
        records, _ = self._load_jsonl_for_write(path, base_mtime_ns)
        question = self._clean(
            {
                "id": self._next_question_id(records),
                "text": text.strip(),
                "source_ref": (source_ref or "").strip(),
                "source_hint": self._source_hint(session, source_ref or ""),
                "rationale": (rationale or "").strip(),
                "status": "proposed",
                "routed_skill": routed_skill or None,
                "prompt": None,
                "evidence": "",
                "verdict": None,
                "finding_ref": None,
                "created_at": self._utc_now_iso(),
                "updated_at": self._utc_now_iso(),
            }
        )
        if not question.get("text"):
            raise JsonlIntegrityError("question text is required")
        records.append(question)
        self._write_jsonl(path, records)
        return self.read_questions(session_path)

    def update_question(
        self,
        session_path: str,
        base_mtime_ns: int,
        question_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        path = self._sidecar_path(self._session_file(session_path), "questions")
        records, _ = self._load_jsonl_for_write(path, base_mtime_ns)
        changed = False
        for record in records:
            if record.get("id") == question_id:
                record.update({k: v for k, v in updates.items() if v is not None})
                if "source_ref" in updates:
                    session = self._load_session(self._session_file(session_path))
                    record["source_hint"] = self._source_hint(session, str(updates.get("source_ref") or ""))
                record["updated_at"] = self._utc_now_iso()
                changed = True
                break
        if not changed:
            raise QuestionNotFoundError(f"question not found: {question_id}")
        self._write_jsonl(path, records)
        return self.read_questions(session_path)

    def record_verdict(
        self,
        session_path: str,
        base_mtime_ns: int,
        question_id: str,
        evidence: str,
        verdict: str,
    ) -> dict[str, Any]:
        detail = self.read_questions(session_path)
        question = self._question_by_id(detail["questions"], question_id)
        session = self._load_session(self._session_file(session_path))
        prompt = self.prompts.question(
            session_path,
            session,
            question,
            str(question.get("routed_skill") or "crypto-audit-router"),
        )
        return self.update_question(
            session_path,
            base_mtime_ns,
            question_id,
            {"evidence": evidence, "verdict": verdict, "prompt": prompt, "status": "answered"},
        )

    def regenerate_prompt(self, session_path: str, question_id: str, chosen_skill: str | None = None) -> dict[str, str]:
        questions = self.read_questions(session_path)["questions"]
        question = self._question_by_id(questions, question_id)
        if chosen_skill:
            question = {**question, "routed_skill": chosen_skill}
        session = self._load_session(self._session_file(session_path))
        skill = str(question.get("routed_skill") or "crypto-audit-router")
        return {"prompt": self.prompts.question(session_path, session, question, skill)}

    def read_pending(self, session_path: str) -> dict[str, Any]:
        session_file = self._session_file(session_path)
        path = self._sidecar_path(session_file, "pending")
        detail = self._read_sidecar(path)
        questions = self.read_questions(session_path)["questions"]
        session = self._load_session(session_file)
        findings = self._finding_ids(session)
        question_map = {q.get("id"): q for q in questions}
        diagnostics = list(detail["diagnostics"])
        pending = []
        for record in detail["records"]:
            question = question_map.get(record.get("question_id"))
            finding_ref = question.get("finding_ref") if isinstance(question, dict) else None
            imported = bool(finding_ref and finding_ref in findings)
            if finding_ref and finding_ref not in findings:
                diagnostics.append(
                    {
                        "line": None,
                        "message": f"question {record.get('question_id')} links to missing finding {finding_ref}",
                    }
                )
            pending.append({**record, "imported": imported, "finding_ref": finding_ref})
        return {"records": pending, "mtime_ns": detail["mtime_ns"], "diagnostics": diagnostics}

    def buffer_candidate(
        self,
        session_path: str,
        questions_mtime_ns: int,
        pending_mtime_ns: int,
        question_id: str,
        proposed: dict[str, str],
    ) -> dict[str, Any]:
        questions_path = self._sidecar_path(self._session_file(session_path), "questions")
        pending_path = self._sidecar_path(self._session_file(session_path), "pending")
        questions, _ = self._load_jsonl_for_write(questions_path, questions_mtime_ns)
        pending, _ = self._load_jsonl_for_write(pending_path, pending_mtime_ns)
        question = self._question_by_id(questions, question_id)
        if any(record.get("question_id") == question_id for record in pending):
            raise QuestionConflictError(f"pending candidate already exists for question: {question_id}")
        pending.append(
            {
                "question_id": question_id,
                "proposed": self._clean(dict(proposed)),
                "created_at": self._utc_now_iso(),
                "updated_at": self._utc_now_iso(),
            }
        )
        question["status"] = "candidate"
        question["updated_at"] = self._utc_now_iso()
        self._write_jsonl(pending_path, pending)
        self._write_jsonl(questions_path, questions)
        return self.read_pending(session_path)

    def import_pending(
        self,
        session_path: str,
        session_mtime_ns: int,
        questions_mtime_ns: int,
        pending_mtime_ns: int,
        question_ids: list[str],
    ) -> dict[str, Any]:
        session_file = self._session_file(session_path)
        questions_path = self._sidecar_path(session_file, "questions")
        pending_path = self._sidecar_path(session_file, "pending")
        self._check_mtime(session_file, session_mtime_ns)
        questions, _ = self._load_jsonl_for_write(questions_path, questions_mtime_ns)
        pending, _ = self._load_jsonl_for_write(pending_path, pending_mtime_ns)
        session = self._load_session(session_file)
        findings = session.setdefault("open_findings", [])
        if not isinstance(findings, list):
            raise JsonlIntegrityError("open_findings must be a list")
        existing_ids = self._finding_ids(session)
        pending_by_question = {record.get("question_id"): record for record in pending}

        for question_id in question_ids:
            pending_record = pending_by_question.get(question_id)
            if pending_record is None:
                raise PendingNotFoundError(f"pending candidate not found: {question_id}")
            question = self._question_by_id(questions, question_id)
            finding_id = question.get("finding_ref") or self._next_finding_id(existing_ids)
            if finding_id not in existing_ids:
                proposed = pending_record.get("proposed") if isinstance(pending_record.get("proposed"), dict) else {}
                findings.append(
                    self._clean(
                        {
                            "id": finding_id,
                            "status": "unverified",
                            "summary": proposed.get("summary") or question.get("text") or finding_id,
                            "severity": proposed.get("severity"),
                            "owner_skill": proposed.get("owner_skill") or question.get("routed_skill"),
                            "description": question.get("evidence"),
                        }
                    )
                )
                existing_ids.add(str(finding_id))
            question["finding_ref"] = finding_id
            question["status"] = "candidate"
            question["updated_at"] = self._utc_now_iso()

        session["updated_at"] = self._utc_now_iso()
        session_text = json.dumps(session, indent=2, ensure_ascii=False) + "\n"
        questions_text = self._jsonl_text(questions)
        write_two_files_atomic(questions_path, questions_text, session_file, session_text)
        return {"session": session, "questions": self.read_questions(session_path), "pending": self.read_pending(session_path)}

    def coverage(self, session_path: str) -> dict[str, Any]:
        questions = self.read_questions(session_path)["questions"]
        answered = [q for q in questions if q.get("status") in {"answered", "candidate"}]
        findings = [q for q in questions if q.get("finding_ref")]
        return {
            "questions": questions,
            "summary": {
                "asked": len(questions),
                "answered": len(answered),
                "findings": len(findings),
                "pending": len([q for q in questions if q.get("status") == "candidate" and not q.get("finding_ref")]),
            },
        }

    def coverage_markdown(self, session_path: str) -> str:
        coverage = self.coverage(session_path)
        lines = [f"# Coverage Trail: {session_path}", ""]
        for question in coverage["questions"]:
            verdict = question.get("verdict") or question.get("status") or "proposed"
            ref = f" -> {question['finding_ref']}" if question.get("finding_ref") else ""
            lines.append(f"- {question.get('id')}: {question.get('text')} — {verdict}{ref}")
        return "\n".join(lines) + "\n"

    def suggest_routes(self, text: str, limit: int = 3) -> dict[str, Any]:
        query = self._tokens(text)
        if not query:
            return {"suggestions": [], "confidence": "none"}
        expanded = set(query)
        for token in list(query):
            expanded.update(SYNONYMS.get(token, set()))

        suggestions = []
        try:
            routes = self.metadata.load_routes()
            skills = self.metadata.load_skills()
        except MetadataError:
            return {"suggestions": [], "confidence": "metadata_unavailable"}

        excluded = set(routes.get("user_triggered_only_exclusions", []))
        skill_meta = {
            item.get("skill_name"): item
            for item in skills.get("skills", [])
            if isinstance(item, dict) and isinstance(item.get("skill_name"), str)
        }
        for rule in routes.get("routing_rules", []):
            if not isinstance(rule, dict):
                continue
            predicate = str(rule.get("predicate", ""))
            route_to = [s for s in rule.get("route_to", []) if isinstance(s, str) and s not in excluded]
            if not route_to:
                continue
            haystack = set(self._tokens(predicate))
            for skill in route_to:
                meta = skill_meta.get(skill, {})
                haystack.update(self._tokens(" ".join(str(meta.get(k, "")) for k in ("skill_name", "plugin_category", "phase"))))
                matched = sorted(expanded.intersection(haystack))
                if matched:
                    suggestions.append(
                        {
                            "skill": skill,
                            "rule_id": rule.get("rule_id"),
                            "matched_terms": matched,
                            "score": len(matched),
                            "reason": predicate,
                        }
                    )
        suggestions.sort(key=lambda item: item["score"], reverse=True)
        top = suggestions[:limit]
        confidence = "none" if not top else ("low" if top[0]["score"] < 2 else "suggested")
        return {"suggestions": top, "confidence": confidence}

    def _session_file(self, session_path: str) -> Path:
        try:
            path = resolve_session_path(self.repo_root, session_path)
        except PathGuardError as exc:
            raise SidecarPathError(str(exc)) from exc
        if not path.is_file():
            raise SidecarPathError(f"session file not found: {session_path}")
        return path

    def _sidecar_path(self, session_file: Path, kind: str) -> Path:
        if kind not in {"questions", "pending"}:
            raise SidecarPathError(f"unknown sidecar kind: {kind}")
        sidecar = session_file.with_suffix(f".{kind}.jsonl")
        try:
            relative = sidecar.resolve().relative_to(self.sessions_root.resolve())
        except ValueError as exc:
            raise SidecarPathError(f"sidecar escapes sessions root: {sidecar}") from exc
        if {"pocs", "reports"}.intersection(relative.parts):
            raise SidecarPathError(f"sidecar targets a non-session artifact directory: {sidecar}")
        if not session_file.is_file():
            raise SidecarPathError(f"sidecar has no matching session file: {session_file}")
        return sidecar

    def _read_sidecar(self, path: Path) -> dict[str, Any]:
        records, diagnostics = self._read_jsonl_tolerant(path)
        return {"records": records, "questions": records, "mtime_ns": self._mtime(path), "diagnostics": diagnostics}

    def _read_jsonl_tolerant(self, path: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        if not path.exists():
            return [], []
        records = []
        diagnostics = []
        for line_no, line in enumerate(path.read_text().splitlines(), start=1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                diagnostics.append({"line": line_no, "message": f"Invalid JSONL: {exc.msg}"})
                continue
            if isinstance(value, dict):
                records.append(value)
            else:
                diagnostics.append({"line": line_no, "message": "JSONL line is not an object"})
        return records, diagnostics

    def _load_jsonl_for_write(self, path: Path, base_mtime_ns: int) -> tuple[list[dict[str, Any]], int]:
        self._check_mtime(path, base_mtime_ns)
        records, diagnostics = self._read_jsonl_tolerant(path)
        if diagnostics:
            raise JsonlIntegrityError(f"refusing to overwrite malformed JSONL: {path}")
        return records, self._mtime(path)

    def _check_mtime(self, path: Path, base_mtime_ns: int) -> None:
        current = self._mtime(path)
        if current != base_mtime_ns:
            raise WriteConflictError(f"file changed since load: {path}")

    def _mtime(self, path: Path) -> int:
        return path.stat().st_mtime_ns if path.exists() else 0

    def _write_jsonl(self, path: Path, records: list[dict[str, Any]]) -> None:
        write_text_atomic(path, self._jsonl_text(records))

    def _jsonl_text(self, records: list[dict[str, Any]]) -> str:
        return "".join(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n" for record in records)

    def _load_session(self, path: Path) -> dict[str, Any]:
        data = json.loads(path.read_text())
        # Same write-target check as SessionStore: a session must be an object
        # carrying engagement_id, so import cannot scribble a finding into a
        # non-session JSON file that merely passed the path guard.
        if not isinstance(data, dict) or not isinstance(data.get("engagement_id"), str):
            raise JsonlIntegrityError(f"write target is not session state JSON: {path}")
        return data

    def _next_question_id(self, records: list[dict[str, Any]]) -> str:
        max_id = 0
        for record in records:
            value = str(record.get("id", ""))
            match = re.fullmatch(r"Q-(\d+)", value)
            if match:
                max_id = max(max_id, int(match.group(1)))
        return f"Q-{max_id + 1:02d}"

    def _next_finding_id(self, existing_ids: set[str]) -> str:
        max_id = 0
        for value in existing_ids:
            match = re.fullmatch(r"F-(\d+)", value)
            if match:
                max_id = max(max_id, int(match.group(1)))
        return f"F-{max_id + 1:02d}"

    def _finding_ids(self, session: dict[str, Any]) -> set[str]:
        ids = set()
        for collection in ("open_findings", "verified_findings"):
            value = session.get(collection, [])
            if not isinstance(value, list):
                continue
            for item in value:
                if isinstance(item, dict) and isinstance(item.get("id"), str):
                    ids.add(item["id"])
        return ids

    def _question_by_id(self, questions: list[dict[str, Any]], question_id: str) -> dict[str, Any]:
        for question in questions:
            if question.get("id") == question_id:
                return question
        raise QuestionNotFoundError(f"question not found: {question_id}")

    def _source_hint(self, session: dict[str, Any], raw_ref: str) -> dict[str, Any]:
        source_ref = raw_ref.strip()
        if not source_ref:
            return {"status": "empty"}
        lookup = re.sub(r":\d+(?::\d+)?$", "", source_ref)
        candidate = Path(lookup)
        if candidate.is_absolute():
            return {"status": "resolved" if candidate.exists() else "unresolved", "mode": "absolute", "path": str(candidate)}
        repo_candidate = self.repo_root / lookup
        if repo_candidate.exists():
            return {"status": "resolved", "mode": "repo_relative", "path": str(repo_candidate)}
        skipped = 0
        for target in self._target_dirs(session):
            target_candidate = target / lookup
            if target_candidate.exists():
                return {"status": "resolved", "mode": "target_relative", "path": str(target_candidate)}
            skipped += 1
        return {"status": "unresolved", "skipped_targets": skipped}

    def _target_dirs(self, session: dict[str, Any]) -> list[Path]:
        targets = session.get("targets", [])
        if isinstance(targets, str):
            targets = [targets]
        if not isinstance(targets, list):
            return []
        dirs = []
        for target in targets:
            if not isinstance(target, str):
                continue
            candidate_text = target
            if " @ " in candidate_text:
                candidate_text = candidate_text.rsplit(" @ ", 1)[1]
            candidate = Path(candidate_text)
            if not candidate.is_absolute():
                candidate = self.repo_root / candidate
            if candidate.is_dir():
                dirs.append(candidate)
        return dirs

    def _tokens(self, text: str) -> set[str]:
        return {token for token in re.split(r"[^a-z0-9]+", text.lower()) if len(token) > 2}

    def _clean(self, value: dict[str, Any]) -> dict[str, Any]:
        return {key: item for key, item in value.items() if item not in (None, "")}

    def _utc_now_iso(self) -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


__all__ = [
    "InvestigationStore",
    "InvestigationStoreError",
    "JsonlIntegrityError",
    "PendingNotFoundError",
    "QuestionConflictError",
    "QuestionNotFoundError",
    "SidecarPathError",
    "WriteConflictError",
]
