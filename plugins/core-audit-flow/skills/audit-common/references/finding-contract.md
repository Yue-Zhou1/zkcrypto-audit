# Finding Contract

## Candidate handoff

Every domain auditor hands off candidates, not findings. Each candidate
carries the auditor's domain-specific fields plus these three:

- `evidence`: `file:line` references and any test or tool output
- `disposition`: one of `unverified` (suspected, awaiting `crypto-fp-check`),
  `false_positive` (ruled out, with the code pointer that rules it out),
  `observation` (true but not a vulnerability), `residual_risk` (accepted or
  out-of-scope exposure). `verified` is set only by `crypto-fp-check`
- `next_route`: the skill that should act on it next

A domain auditor does not assign final severity.

## Confirmed finding

Every confirmed finding should answer the same questions in the same order.

## Required Fields

1. **Title** — short statement of the bug class and affected component
2. **Severity** — Critical/High/Medium/Low using `severity-framework.md`
3. **Impacted property** — Soundness, Privacy, Completeness, or DoS
4. **Root cause** — the exact implementation failure, not the symptom
5. **Invariant violated** — what the code should have enforced
6. **Trigger path** — function, file, code path, and attacker-controlled inputs
7. **Evidence** — code references, test evidence, math argument, or runtime proof
8. **Exploitability** — what attacker control is required and whether exploitation is practical
9. **PoC status** — required for Critical/High, optional for Medium/Low
10. **Prior art** — relevant `zkbugs-index` IDs if they exist
11. **Remediation direction** — validation, binding, typing, constant-time rewrite, etc.

## Style Rules

- State what the code enforces, not what the docs intend.
- Separate attacker control from impact.
- If evidence is partial, say so explicitly instead of overstating certainty.
