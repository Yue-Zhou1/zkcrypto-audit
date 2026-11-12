---
name: spec-delta-checker
description: >
  Compare cryptographic code against a reference specification or paper. Use
  when implementation details look close to a standard but may have drifted in
  validation, transcript binding, parameter negotiation, or caller obligations.
allowed-tools: Read Grep Glob
---

# spec-delta-checker

Focused skill for specification-versus-implementation review.

**Core principle:** verify what the code actually enforces, not what the docs
claim.

## When to Use

- The implementation claims to follow a paper, RFC, or upstream reference crate
- You suspect the code omits a condition that the specification assumes
- Security depends on caller obligations that may not be enforced locally
- Protocol glue code appears to adapt a standard primitive or proof system
- The project's own docs, comments, constants, or accepted-risk register make
  claims the code may not enforce (internal drift; see Phase 5 of the workflow)

## When NOT to Use

- Building initial context before you know which spec or paper governs the
  code -> `crypto-audit-context`
- Hunting implementation bugs that are unrelated to any specification -> the
  domain auditor for that code
- Deciding whether a delta is exploitable -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The deviation is just a performance optimization" | Optimizations are a primary source of semantic-drift bugs |
| "The paper doesn't apply to this implementation" | If the code cites the paper, the deltas are audit surface |
| "The spec is ambiguous here" | Ambiguity in the spec plus code that picks one interpretation is still an untested assumption |

## Workflow

Execute [workflows/delta-review.md](workflows/delta-review.md) in order. Treat
every implementation delta as a potential finding candidate until you can prove
it is benign.

## Reference Use

- Use `crypto-audit-context` first if the target codebase is still unfamiliar
- Send surviving deviations to `crypto-fp-check`
- Use `audit-common` when the delta turns into a reportable finding

## Output Contract

Produce a delta handoff listing each delta with:

- `reference`: the governing specification, paper, or project document, with
  the section or location
- `implementation_location`: where the code diverges (`file:line`)
- `delta_kind`: omission, adaptation, or shifted caller obligation
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [workflows/delta-review.md](workflows/delta-review.md)
