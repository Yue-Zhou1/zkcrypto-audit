from __future__ import annotations

from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

from emu.services.metadata import MetadataError, MetadataService


DISPOSITIONS = (
    "verified",
    "false_positive",
    "unverified",
    "observation",
    "residual_risk",
    "unknown",
)


def _truncate(text: str, limit: int = 140) -> str:
    return text if len(text) <= limit else text[: limit - 1] + "…"


# Single source of truth for which skill a gate status (or a phase fallback)
# routes to. Both per-gate prompts and the next-action prompt read this, so
# their phrasing cannot drift apart. A status absent here gets no prompt.
GATE_SKILL = {
    "blocked": "crypto-fp-check",
    "should_promote": "crypto-fp-check",
    "insufficient_data": "crypto-fp-check",
    "ready_for_report_writer": "crypto-report-writer",
    "needs_repair": "crypto-report-writer",
    "needs_classification": "crypto-audit-router",
    "needs_rationale": "crypto-audit-router",
    "needs_intake": "crypto-audit-context",
}


@dataclass(frozen=True)
class GateResult:
    gate: str
    status: str
    finding_id: str | None = None
    message: str = ""
    reads: tuple[str, ...] = ()
    prompt: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "gate": self.gate,
            "status": self.status,
            "finding_id": self.finding_id,
            "message": self.message,
            "reads": list(self.reads),
            "prompt": self.prompt,
        }


class DerivedSessionService:
    def __init__(self, repo_root: Path, metadata: MetadataService) -> None:
        self.repo_root = repo_root
        self.metadata = metadata

    def current_phase(self, session: dict[str, Any]) -> dict[str, str | None]:
        explicit = session.get("phase")
        if isinstance(explicit, str) and explicit:
            return {"source": "session", "phase": explicit, "runtime_phase": self._runtime_phase(explicit)}

        inferred = self._infer_phase(session)
        return {"source": "inferred", "phase": inferred, "runtime_phase": inferred}

    def finding_groups(self, session: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
        groups: dict[str, list[dict[str, Any]]] = {disposition: [] for disposition in DISPOSITIONS}

        for finding in self._findings(session, "open_findings"):
            groups[self.disposition_for_finding(finding, "open_findings")].append(finding)
        for finding in self._findings(session, "verified_findings"):
            groups[self.disposition_for_finding(finding, "verified_findings")].append(finding)

        return groups

    def finding_dispositions(self, session: dict[str, Any]) -> dict[str, str]:
        dispositions: dict[str, str] = {}
        for collection in ("open_findings", "verified_findings"):
            for finding in self._findings(session, collection):
                finding_id = self._finding_id(finding)
                if finding_id is not None:
                    dispositions.setdefault(finding_id, self.disposition_for_finding(finding, collection))
        return dispositions

    def disposition_for_finding(self, finding: dict[str, Any], collection: str) -> str:
        status = self._status_text(finding)
        lowered = status.lower().replace("-", "_")

        if any(term in lowered for term in ("false_positive", "false positive", "no_finding", "not_a_finding")):
            return "false_positive"
        if any(term in lowered for term in ("residual_risk", "residual risk")):
            return "residual_risk"
        if any(term in lowered for term in ("informational", "info", "observation", "by_design", "by design")):
            return "observation"
        if any(term in lowered for term in ("unverified", "candidate", "pending", "needs")):
            return "unverified"
        if any(term in lowered for term in ("verified", "true_positive", "true positive", "complete")):
            return "verified"
        if collection == "verified_findings":
            return "verified"
        return "unknown"

    def evidence_gates(
        self,
        session: dict[str, Any],
        validation: dict[str, Any],
        session_file: Path | None = None,
        session_path: str = "",
    ) -> list[dict[str, Any]]:
        gates: list[GateResult] = []
        open_findings = self._findings(session, "open_findings")
        verified_findings = self._findings(session, "verified_findings")

        if not validation.get("valid", True):
            gates.append(
                GateResult(
                    gate="schema_required_fields",
                    status="needs_intake",
                    message="Session is missing required schema fields or has schema diagnostics.",
                    reads=("session-state-schema.json",),
                )
            )

        for finding in open_findings:
            finding_id = self._finding_id(finding)
            poc_gate = self._poc_gate(finding, "open_findings", session, session_file)
            if poc_gate is not None:
                gates.append(poc_gate)

            if not finding.get("owner_skill") and not finding.get("routing"):
                gates.append(
                    GateResult(
                        gate="owner_skill",
                        status="needs_classification",
                        finding_id=finding_id,
                        message="Open finding has no owner_skill.",
                        reads=("open_findings[].owner_skill", "open_findings[].routing"),
                    )
                )

            if self.disposition_for_finding(finding, "open_findings") == "verified":
                gates.append(
                    GateResult(
                        gate="verified_open_finding",
                        status="should_promote",
                        finding_id=finding_id,
                        message="Open finding status is verified and should be promoted into verified_findings.",
                        reads=("open_findings[].status",),
                    )
                )

        for finding in verified_findings:
            finding_id = self._finding_id(finding)
            poc_gate = self._poc_gate(finding, "verified_findings", session, session_file)
            if poc_gate is not None:
                gates.append(poc_gate)

            report_ref = finding.get("report_ref")
            if not report_ref:
                gates.append(
                    GateResult(
                        gate="report_ref",
                        status="ready_for_report_writer",
                        finding_id=finding_id,
                        message="Verified finding has no report_ref.",
                        reads=("verified_findings[].report_ref",),
                    )
                )
            elif not self._report_ref_exists(str(report_ref), session_file):
                gates.append(
                    GateResult(
                        gate="report_ref_exists",
                        status="needs_repair",
                        finding_id=finding_id,
                        message=f"Report reference does not resolve to an existing file: {report_ref}",
                        reads=("verified_findings[].report_ref",),
                    )
                )

        phase = str(self.current_phase(session).get("runtime_phase") or "")
        if phase in {"domain", "verification", "reporting", "indexing"} and not open_findings and not verified_findings:
            rationale = " ".join(str(item) for item in session.get("next_steps", []) if isinstance(item, str))
            if "no finding" not in rationale.lower() and "no issue" not in rationale.lower():
                gates.append(
                    GateResult(
                        gate="empty_findings_rationale",
                        status="needs_rationale",
                        message="Session has no findings after domain phase without an explicit next_steps rationale.",
                        reads=("open_findings", "verified_findings", "next_steps"),
                    )
                )

        if not gates:
            gates.append(
                GateResult(
                    gate="evidence_overview",
                    status="clear",
                    message="No evidence gate is currently blocking the modeled workflow state.",
                )
            )

        return [self._with_prompt(gate, session_path, session).to_dict() for gate in gates]

    def _with_prompt(self, gate: GateResult, session_path: str, session: dict[str, Any]) -> GateResult:
        skill = GATE_SKILL.get(gate.status)
        if skill is None:
            return gate
        prompt = self._prompt(session_path, session, skill, gate.message, gate.finding_id)
        return replace(gate, prompt=prompt)

    def next_action(self, session_path: str, session: dict[str, Any], gates: list[dict[str, Any]]) -> dict[str, Any]:
        phase = self.current_phase(session)
        runtime_phase = phase.get("runtime_phase")
        try:
            default_skill = self.metadata.default_skill_for_phase(str(runtime_phase)) if runtime_phase else None
        except MetadataError:
            default_skill = None
        has_targets = self._has_targets(session)
        has_boundaries = bool(session.get("trust_boundaries"))
        has_findings = bool(session.get("open_findings") or session.get("verified_findings"))

        if not has_targets:
            return self._action(
                phase,
                next_skill="crypto-audit-context",
                reason="No target is set yet. Add the Rust crate or workspace folder to audit.",
                finding=None,
                session_path=session_path,
                session=session,
            )
        if not has_boundaries and not has_findings:
            return self._action(
                phase,
                next_skill="crypto-audit-context",
                reason="Targets are set but trust boundaries are empty. Capture trust boundaries and critical paths before routing.",
                finding=None,
                session_path=session_path,
                session=session,
            )

        # Act on the highest-priority gate that maps to a skill; the gate already
        # carries the prompt built from the shared GATE_SKILL mapping.
        priority = ("blocked", "should_promote", "ready_for_report_writer")
        for status in priority:
            gate = next((g for g in gates if g.get("status") == status), None)
            if gate:
                return self._action(
                    phase,
                    next_skill=GATE_SKILL[status],
                    reason=gate.get("message", "Evidence gate needs handling."),
                    finding=gate.get("finding_id"),
                    session_path=session_path,
                    session=session,
                )

        return self._action(
            phase,
            next_skill=default_skill or "crypto-audit-router",
            reason="Continue the staged audit flow from the current session phase.",
            finding=None,
            session_path=session_path,
            session=session,
        )

    def _action(
        self,
        phase: dict[str, str | None],
        next_skill: str,
        reason: str,
        finding: str | None,
        session_path: str,
        session: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "phase": phase,
            "next_skill": next_skill,
            "reason": reason,
            "finding_id": finding,
            "prompt": self._prompt(session_path, session, next_skill, reason, finding),
        }

    def _prompt(
        self,
        session_path: str,
        session: dict[str, Any],
        next_skill: str,
        reason: str,
        finding_id: str | None,
    ) -> str:
        engagement = session.get("engagement_id", "unknown engagement")
        finding_clause = f" on finding {finding_id}" if finding_id else ""
        return (
            f"Resume engagement {engagement} from zk-findings/sessions/{session_path}.\n"
            "Invoke crypto-audit-router to confirm the current phase, then use "
            f"{next_skill}{finding_clause}. Reason: {reason}"
        )

    def _infer_phase(self, session: dict[str, Any]) -> str:
        if session.get("open_findings"):
            return "verification"
        if session.get("verified_findings"):
            return "reporting"
        if not self._has_targets(session) or not session.get("trust_boundaries"):
            return "intake"
        return "domain"

    def _has_targets(self, session: dict[str, Any]) -> bool:
        for key in ("targets", "target", "target_scope", "scope"):
            value = session.get(key)
            if value:
                return True
        return False

    def _runtime_phase(self, explicit: str) -> str | None:
        try:
            phase_names = [item.get("phase") for item in self.metadata.phase_flow()]
        except MetadataError:
            return None
        if explicit in phase_names:
            return explicit
        if explicit.endswith("_complete"):
            base_phase = explicit.removesuffix("_complete")
            if base_phase in phase_names:
                index = phase_names.index(base_phase)
                if index + 1 < len(phase_names):
                    return str(phase_names[index + 1])
        if explicit == "complete":
            return "indexing"
        return None

    def _status_text(self, finding: dict[str, Any]) -> str:
        parts = []
        for key in ("status", "verdict", "severity", "severity_estimate", "severity_hint"):
            value = finding.get(key)
            if isinstance(value, str):
                parts.append(value)
        return " ".join(parts)

    def _findings(self, session: dict[str, Any], key: str) -> list[dict[str, Any]]:
        value = session.get(key, [])
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, dict)]

    def _finding_id(self, finding: dict[str, Any]) -> str | None:
        value = finding.get("id")
        return value if isinstance(value, str) else None

    def _is_high_or_critical(self, finding: dict[str, Any]) -> bool:
        text = " ".join(
            str(finding.get(key, ""))
            for key in ("severity", "severity_estimate", "severity_hint")
        ).lower()
        return "critical" in text or "high" in text

    def _poc_gate(
        self,
        finding: dict[str, Any],
        collection: str,
        session: dict[str, Any],
        session_file: Path | None,
    ) -> GateResult | None:
        finding_id = self._finding_id(finding)
        reads = (
            "severity",
            "severity_estimate",
            "severity_hint",
            "poc_artifact",
            "poc",
            "poc_status",
            "pocs/<finding-id>*",
        )

        if not self._severity_text(finding):
            # Open candidates already headed to FP/informational do not need a
            # severity estimate; live candidates and verified findings do.
            if collection == "open_findings" and self.disposition_for_finding(finding, collection) not in {
                "unverified",
                "unknown",
            }:
                return None
            return GateResult(
                gate="high_or_critical_poc",
                status="insufficient_data",
                finding_id=finding_id,
                message="No severity is recorded for this finding, so the PoC gate cannot be evaluated.",
                reads=reads,
            )

        if not self._is_high_or_critical(finding):
            return None

        poc_file = self._poc_file_for_finding(finding_id, session_file)
        if poc_file is not None:
            return None

        field_evidence = self._poc_field_evidence(finding)
        if field_evidence is not None:
            key, value = field_evidence
            return GateResult(
                gate="high_or_critical_poc",
                status="insufficient_data",
                finding_id=finding_id,
                message=f"Field {key} is recorded but emu cannot judge whether it is executable proof: {_truncate(value)}",
                reads=reads,
            )

        session_evidence = self._poc_field_evidence(session)
        if session_evidence is not None:
            key, value = session_evidence
            return GateResult(
                gate="high_or_critical_poc",
                status="insufficient_data",
                finding_id=finding_id,
                message=f"Session-level field {key} exists but is not tied to this finding: {_truncate(value)}",
                reads=reads,
            )

        return GateResult(
            gate="high_or_critical_poc",
            status="blocked",
            finding_id=finding_id,
            message="High or Critical finding needs a PoC or equivalent executable proof.",
            reads=reads,
        )

    def _severity_text(self, finding: dict[str, Any]) -> str:
        return " ".join(
            str(finding[key]) for key in ("severity", "severity_estimate", "severity_hint") if finding.get(key)
        )

    def _poc_field_evidence(self, source: dict[str, Any]) -> tuple[str, str] | None:
        for key in ("poc_artifact", "poc_artifacts", "poc_status", "poc", "proof_artifact", "proof"):
            value = source.get(key)
            if value:
                return key, str(value)
        return None

    def _poc_file_for_finding(self, finding_id: str | None, session_file: Path | None) -> Path | None:
        if not finding_id or session_file is None:
            return None
        for base in (session_file.parent, session_file.parent.parent):
            pocs_dir = base / "pocs"
            if not pocs_dir.is_dir():
                continue
            for candidate in sorted(pocs_dir.iterdir()):
                if candidate.is_file() and candidate.name.startswith(finding_id):
                    return candidate
        return None

    def _report_ref_exists(self, report_ref: str, session_file: Path | None) -> bool:
        ref_path = report_ref.split("#", 1)[0]
        candidates = [self.repo_root / ref_path]
        if session_file is not None:
            candidates.append(session_file.parent / ref_path)
        return any(candidate.exists() for candidate in candidates)
