---
name: crypto-audit-router
description: >
  Orchestrate a full cryptographic or ZK audit: intake, spec comparison, domain
  auditors, verification, and reporting, with session state kept on disk. Use
  when starting or resuming an audit, deciding which auditors apply to a
  target, or moving a suspected issue from domain review to a verified,
  reported finding.
allowed-tools: Read Grep Glob Write Edit
---

# crypto-audit-router

Top-level orchestrator. Selects and sequences the other skills and owns the
engagement's session state. Does not audit code.

## When to Use

- Starting a new audit, or resuming one from an existing `session.json`
- Deciding which domain auditors apply to a target
- Moving a suspected issue from domain review to verification and reporting
- Coordinating several auditors without losing their handoff artifacts

## When NOT to Use

- Reviewing code in one known domain -> the matching domain auditor
- Deciding whether one specific finding is real -> `crypto-fp-check`
- Checking a supplied patch -> `fix-verification`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "No ZK code, skip zk-circuit-auditor" | Fiat-Shamir transcripts appear outside ZK circuits too; route on what the code does, not what the project is called |
| "It's just Rust safety, no crypto-specific review needed" | `rust-crypto-safety` covers zeroization, panics on untrusted input, and `unsafe`, which are crypto-specific here |
| "We already ran spec-delta-checker, skip domain audit" | `spec-delta-checker` finds drift; domain auditors find implementation bugs unrelated to the spec |
| "It runs on SP1, so zkvm-auditor covers it" | `zkvm-auditor` covers the runtime; the application's prover inputs, witnesses, and settlement contract need `proven-state-transition-auditor` |
| "The settlement contract is plain Solidity, out of scope" | The contract is the proof consumer and holds every liveness guarantee; it is in scope through `proven-state-transition-auditor` |
| "One real finding is enough to write up" | The flow ends when every matched route has a disposition, not when the first issue appears |
| "That skill is not installed, I will cover it myself" | Record the route as skipped with that reason and tell the user; an improvised pass has none of the skill's checklists behind it |

## Workflow

1. Read `workflows/full-audit-flow.md` completely before selecting anything.
2. Create or resume the audit workspace it describes and keep `session.json`
   valid against `references/session-state-schema.json`.
3. Run intake with `crypto-audit-context`.
4. Select routes from `references/routing-matrix.md` and run them.
5. Verify with `crypto-fp-check`, report with `crypto-report-writer`, close out.
6. Check `references/state-machine.md` before every phase transition.

## Routing Authority

- `references/routing-matrix.md` is the routing policy: which skills always
  run, which are selected by situation, and which are user-triggered only.
- A user-triggered skill is never selected by this router. It runs only on
  request.
- Other skills are referred to by name.

## Output Contract

Produce, and keep current in `session.json`:

- The routes selected, with the reason each applies, and the routes skipped,
  with the reason each does not
- The candidate list with a status for every entry
- The current phase and the guard that allows the next transition
- The next unresolved branch or escalation point

At closeout, confirm the completion contract in
`workflows/full-audit-flow.md` item by item.

## Reference Index

- [workflows/full-audit-flow.md](workflows/full-audit-flow.md)
- [references/routing-matrix.md](references/routing-matrix.md)
- [references/state-machine.md](references/state-machine.md)
- [references/session-state-schema.json](references/session-state-schema.json)
- [references/session-state-template.json](references/session-state-template.json)
