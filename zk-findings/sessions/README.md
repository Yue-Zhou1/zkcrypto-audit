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
- Validate file shape against `session-state-schema.json`
- Update the file at each workflow handoff boundary (context, domain review,
  verification, reporting)

These files are intended for local collaboration and should be treated as
sensitive working state.
