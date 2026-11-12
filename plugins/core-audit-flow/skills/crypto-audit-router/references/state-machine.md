# Session State Machine

Governs the `phase` field of `session.json` and what may change in each phase.
The schema is `references/session-state-schema.json` (version 3).

## States

| State | Meaning |
|---|---|
| `intake_pending` | Engagement context is being built or repaired |
| `domain_in_progress` | Domain auditors are running; candidates are being raised |
| `verification_in_progress` | Candidates are being verified or rejected |
| `reporting_in_progress` | Verified candidates are being written up |
| `remediation_in_progress` | A supplied fix is being checked against verified findings |
| `closed` | Artifacts are consistent and the handoff is complete |

## Allowed Transitions

| From | To | Guard |
|---|---|---|
| `intake_pending` | `domain_in_progress` | `targets`, `trust_boundaries`, and `critical_paths` are non-empty |
| `domain_in_progress` | `verification_in_progress` | Every matched route is `completed` or `skipped` with a reason |
| `verification_in_progress` | `domain_in_progress` | A candidate needs more domain analysis before it can be decided |
| `verification_in_progress` | `reporting_in_progress` | Every candidate has a decided status, or is `unverified` with a reason and a next step |
| `reporting_in_progress` | `verification_in_progress` | Report content goes beyond the verified evidence, or a severity is unsupported |
| `reporting_in_progress` | `closed` | Report, PoC artifacts, and `session.json` describe the same claim set |
| `closed` | `remediation_in_progress` | A fix reference is supplied for a `verified` candidate |
| `remediation_in_progress` | `verification_in_progress` | The patch changes the original claim or introduces a candidate regression |
| `remediation_in_progress` | `closed` | Every targeted finding has a `remediation_verifications` verdict with evidence |

Any transition not listed is invalid.

## What Each Phase May Change

- **Intake:** `engagement_id`, `targets`, `trust_boundaries`, `critical_paths`,
  `unresolved_assumptions`, `next_steps`.
- **Domain:** add `routes` entries and move them to `completed` or `skipped`;
  add `candidates` with `owner_skill`, `location`, `summary`, `evidence_refs`.
  A domain auditor may set `false_positive`, `observation`, or `residual_risk`
  with a code pointer. It never sets `verified` or a final severity.
- **Verification:** set candidate `status`, `severity`, `verdict_rationale`,
  `poc_status`, `poc_ref`. Candidates are never deleted; a rejected one stays
  as `false_positive` with the gate that failed.
- **Reporting:** set `report_ref`; fill `artifacts`; refresh `next_steps`. The
  claim, status, and severity of a candidate do not change here.
- **Remediation:** append `remediation_verifications`. The original candidate
  is not rewritten.

Engagement-specific material with no core field goes under `extensions`.

## Before Each Transition

1. Validate `session.json` against the schema.
2. Confirm the transition is in the table and its guard holds.
3. Confirm only the fields allowed for the current phase changed.
4. If a check fails, go back to the earliest phase that can repair the state.
