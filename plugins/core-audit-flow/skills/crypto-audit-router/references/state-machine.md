# Router Session State Machine

This state machine governs router handoffs and session-state mutations.

Schema authority:
`zk-findings/sessions/session-state-schema.json`

## States

| State | Meaning |
|---|---|
| `intake_pending` | Engagement context is being built or repaired. |
| `domain_in_progress` | Domain auditor routing is active; suspected findings are still open. |
| `verification_in_progress` | Surviving findings are being validated for truth/impact. |
| `reporting_in_progress` | Verified findings are being converted to report artifacts. |
| `indexing_in_progress` | Verified findings are being linked to prior art or index records. |
| `remediation_in_progress` | A supplied fix is being verified against previously verified findings. |
| `closed` | All artifacts are consistent and handoff is complete. |

These are the `phase` enum values in session schema v2
(`schema_version: 2`). Session files must set `schema_version` to `2` and keep
engagement-specific fields under `extensions` rather than at the root.

## Allowed Transitions

| From | To | Guard |
|---|---|---|
| `intake_pending` | `domain_in_progress` | Required schema fields are present and non-empty where required. |
| `domain_in_progress` | `verification_in_progress` | Domain output contracts captured; `open_findings` contains review candidates or is explicitly empty with rationale. |
| `verification_in_progress` | `domain_in_progress` | Verification evidence is insufficient; finding requires additional domain analysis. |
| `verification_in_progress` | `reporting_in_progress` | At least one finding promoted to `verified_findings` with evidence. |
| `reporting_in_progress` | `verification_in_progress` | Report content diverges from verified evidence or severity assignment is unsupported. |
| `reporting_in_progress` | `indexing_in_progress` | Report artifacts align with verified findings. |
| `indexing_in_progress` | `reporting_in_progress` | Indexed metadata disagrees with report content or verified claim set. |
| `indexing_in_progress` | `closed` | Report, index artifacts, and `next_steps` all align with verified findings. |
| `closed` | `remediation_in_progress` | A fix reference is supplied for a previously verified finding. |
| `remediation_in_progress` | `verification_in_progress` | The patch changes the original claim or introduces a candidate regression that needs re-verification. |
| `remediation_in_progress` | `closed` | Every targeted finding has a `remediation_verifications` verdict and evidence. |

Any transition not listed above is invalid and must be rejected.

## Mutation Rules by Phase

- Intake (`intake_pending`):
  - Populate/repair `engagement_id`, `targets`, `trust_boundaries`, `next_steps`.
  - Initialize `open_findings` and `verified_findings` arrays if absent.
- Domain (`domain_in_progress`):
  - Add or update entries in `open_findings` with `id`, `status`, `summary`, and optional `owner_skill`.
  - Do not write report references.
- Verification (`verification_in_progress`):
  - Remove rejected findings from `open_findings` or mark status accordingly.
  - Promote accepted findings into `verified_findings` with severity and summary.
- Reporting (`reporting_in_progress`):
  - Add `report_ref` for verified findings.
  - Update `next_steps` to reflect publish/escalation actions.
- Indexing (`indexing_in_progress`):
  - Record prior-art/index actions in `next_steps`.
  - Do not alter the semantic claim of verified findings.
- Remediation (`remediation_in_progress`):
  - Append `remediation_verifications` records with `finding_id`, `fix_ref`,
    `verdict`, `regression_evidence_refs`, and `verified_at`.
  - Do not rewrite the original `verified_findings` claim; capture the fix
    outcome as a separate remediation verdict.

## Enforcement Checklist

Before each phase transition:

1. Validate the current session JSON against
   `../../../../../zk-findings/sessions/session-state-schema.json`.
2. Confirm the transition is listed in the allowed transition table.
3. Confirm phase-specific mutation rules were respected.
4. If any check fails, route back to the earliest phase that can repair state.
