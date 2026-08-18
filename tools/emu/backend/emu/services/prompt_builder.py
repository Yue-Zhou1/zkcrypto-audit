from __future__ import annotations

from typing import Any


class PromptBuilder:
    def next_action(
        self,
        session_path: str,
        session: dict[str, Any],
        next_skill: str,
        reason: str,
        finding_id: str | None = None,
    ) -> str:
        engagement = session.get("engagement_id", "unknown engagement")
        finding_clause = f" on finding {finding_id}" if finding_id else ""
        return (
            f"Resume engagement {engagement} from zk-findings/sessions/{session_path}.\n"
            "Invoke crypto-audit-router to confirm the current phase, then use "
            f"{next_skill}{finding_clause}. Reason: {reason}"
        )

    def question(
        self,
        session_path: str,
        session: dict[str, Any],
        question: dict[str, Any],
        chosen_skill: str,
    ) -> str:
        engagement = session.get("engagement_id", "unknown engagement")
        parts = [
            f"Resume engagement {engagement} from zk-findings/sessions/{session_path}.",
            "Invoke crypto-audit-router to confirm the current phase, then use "
            f"{chosen_skill} to investigate this engineer question.",
            f"Question: {question.get('text', '')}",
        ]
        source_ref = question.get("source_ref")
        if source_ref:
            parts.append(f"Source reference: {source_ref}")
        rationale = question.get("rationale")
        if rationale:
            parts.append(f"Engineer rationale: {rationale}")
        parts.append(
            "Return evidence, reasoning, and a clear verdict: safe, bug, inconclusive, "
            "or needs more evidence. Do not promote findings; preserve the staged audit flow."
        )
        return "\n".join(parts)
