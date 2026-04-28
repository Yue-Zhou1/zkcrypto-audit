# zkcrypto-audit

`zkcrypto-audit` is a plugin collection for staged, evidence-driven audits of
zero-knowledge systems and cryptographic protocols.

## Project Layout

- `plugins/` contains 7 category plugins housing 31 audit skills.
- `.claude-plugin/marketplace.json` is the root marketplace manifest.
- `.agents/plugins/marketplace.json` is the Codex marketplace catalog.
- `.agents/plugins/marketplace.schema.json` validates Codex marketplace structure.
- `plugins/*/.codex-plugin/plugin.json` contains Codex plugin manifests.
- `plugins/_meta/codex-skill-registry.yaml` is the routing policy source of truth.
- `plugins/_meta/router-matrix.yaml` is the machine-readable route matrix.
- `.codex/skills/` contains generated Codex compatibility stubs.
- `tests/` contains scaffolding and CLI regression tests.
- `zk-findings/sessions/` stores local engagement session-state handoff files.

## MANDATORY: Before Starting Any Audit

Before invoking any audit skill, you MUST:

1. Invoke the `crypto-audit-router` skill via the Skill tool.
2. Inside that skill, read `workflows/full-audit-flow.md` completely before
   selecting any domain auditor. Do not rely on memory of prior sessions.
3. Run every step in the order below. Do not skip a step because it seems
   inapplicable — invoke the skill and let it determine applicability.

## Default Audit Flow (ALL STEPS REQUIRED)

| Step | Skill | Skip condition |
|------|-------|----------------|
| 1 | `crypto-audit-router` | Never skip — orchestrates all subsequent routing |
| 2 | `crypto-audit-context` | Never skip — builds trust boundary and dimension map |
| 3 | `spec-delta-checker` | Only skip if there is provably no governing specification or paper |
| 4 | Domain auditor(s) per routing-matrix | Never skip applicable auditors |
| 5 | `crypto-fp-check` | Never skip — all findings must pass verification gates |
| 6 | `crypto-report-writer` | Never skip — required for any client-facing or internal output |
| 7 | `zkbugs-index` | Skip only if all findings are client-confidential and not index-worthy |

**If you skip step 3 or step 7, you must explicitly state why in your response.**

## Session State

After every phase boundary, persist the handoff in:
`zk-findings/sessions/<engagement-id>.json`

The session schema is at `zk-findings/sessions/session-state-schema.json`.
This file is the source of truth for resuming a multi-session audit.

