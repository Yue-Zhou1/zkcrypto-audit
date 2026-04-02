---
name: crypto-audit-router
description: >
  Route a full cryptographic or ZK audit across the framework. Use when you
  need to decide which skill should run next, which domain auditors apply, or
  how to move from initial context to verified finding, report, and index flow.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# crypto-audit-router

Top-level orchestrator for the crypto audit framework.

## When to Use

- Starting a new audit and deciding the execution order
- Choosing between `ecc-pairing-auditor`, `zk-circuit-auditor`, `dkg-threshold-auditor`, `rust-crypto-safety`, or `spec-delta-checker`
- Moving a suspected issue from domain review to verification, reporting, and indexing
- Coordinating multi-skill audits without losing handoff artifacts

## When NOT to Use

- Replacing the domain auditors themselves
- Writing final findings without `crypto-fp-check`
- Querying or writing prior art directly without deciding whether the finding is verified and citable

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "No ZK code, skip zk-circuit-auditor" | Fiat-Shamir transcripts appear outside ZK circuits too |
| "It's just Rust safety, no crypto-specific review needed" | `rust-crypto-safety` covers timing, zeroize, and `unsafe`, which are crypto-specific |
| "We already ran spec-delta-checker, skip domain audit" | `spec-delta-checker` finds drift; domain auditors find implementation bugs unrelated to the spec |

## Workflow

- Read `references/routing-matrix.md` to select the right domain skill set
- Execute `workflows/full-audit-flow.md` to keep the end-to-end sequence consistent
- Preserve the output contract from each skill before routing to the next one

## Routing Scope

This router is responsible for sequencing `crypto-audit-context`,
`spec-delta-checker`, the domain auditors, `crypto-fp-check`,
`crypto-report-writer`, and `zkbugs-index`.

## Output Contract

Produce an audit routing plan that includes:

- The chosen skill sequence and why each skill was selected
- The current artifact handed from one phase to the next
- The stop condition for each phase
- The next unresolved branch or escalation point

## Reference Index

- [references/routing-matrix.md](references/routing-matrix.md)
- [workflows/full-audit-flow.md](workflows/full-audit-flow.md)
