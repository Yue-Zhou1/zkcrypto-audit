# Session State Workspace

`zk-findings/sessions/` stores local, non-public audit engagement state that
must persist across conversations.

## Purpose

- Keep context handoffs, finding status, and next actions synchronized between
  `crypto-audit-context`, domain auditors, `crypto-fp-check`, and reporting
- Avoid losing trust-boundary notes or open-finding threads across chat restarts
- Preserve an auditable local trail without embedding client artifacts into
  plugin prompts

## Usage

- Create one file per engagement, for example:
  `zk-findings/sessions/<engagement-id>.json`
- Validate file shape against `session-state-schema.json` (schema version 2)
- Update the file at each workflow handoff boundary (context, domain review,
  verification, reporting, remediation)

These files are intended for local collaboration and should be treated as
sensitive working state.

## Schema version 2

Session files set `schema_version: 2` and use a strict core contract plus an
`extensions` object. The core fields are:

- `engagement_id`, `phase`, `targets`, `trust_boundaries`, `critical_paths`,
  `unresolved_assumptions`, `route_dispositions`, `open_findings`,
  `verified_findings`, `fp_check_verdicts`, `artifacts` (with `reports`,
  `pocs`, `index_refs`), `remediation_verifications`, `next_steps`,
  `updated_at`, and `extensions`.

`phase` is one of `intake_pending`, `domain_in_progress`,
`verification_in_progress`, `reporting_in_progress`, `indexing_in_progress`,
`remediation_in_progress`, or `closed`.

Each `route_dispositions` entry carries `skill`, `status` (one of `verified`,
`false_positive`, `unverified`, `observation`, `residual_risk`), `summary`, and
`evidence_refs`. Each `remediation_verifications` entry carries `finding_id`,
`fix_ref`, `verdict` (`fixed`, `partially_fixed`, `not_fixed`, `regressed`),
`regression_evidence_refs`, and `verified_at`.

The root is closed (`additionalProperties: false`). Preserve engagement-specific
legacy content under `extensions` rather than dropping evidence.

Validate with:

```bash
python3 -m pip install -r requirements-dev.txt
python3 scripts/validate_session_state.py
```
