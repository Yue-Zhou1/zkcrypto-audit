---
name: cairo-auditor
description: >
  Audit Cairo and Starknet code for hint validation failures, felt252 overflow,
  builtin misuse, and Sierra-to-CASM soundness gaps. Use when reviewing Cairo
  contracts, prover hints, or Starknet-specific proof construction.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# cairo-auditor

Domain auditor for Cairo language and Starknet proof systems.

## When to Use

- Auditing Cairo 1.0+ contracts or libraries
- Reviewing hint functions and their constraint enforcement
- Checking felt252 arithmetic for silent wrapping
- Reviewing Sierra-to-CASM compilation correctness
- Checking builtin usage (range_check, pedersen, poseidon, ec_op)

## When NOT to Use

- Building initial protocol context for a new codebase — use `crypto-audit-context`
- Reviewing generic ZK circuit constraints outside Cairo — use `zk-circuit-auditor`
- Declaring a suspected Cairo bug confirmed without verification

## Core Review Areas

1. Hint validation — prover hints trusted without constraint enforcement
2. felt252 overflow — arithmetic wrapping past the Stark prime silently
3. Builtin misuse — range_check, pedersen, ec_op used incorrectly
4. Sierra-to-CASM soundness — compiler guarantees relied upon but not checked
5. Storage layout — collision between storage variables, mapping key domains

## Workflow

### Phase 1: Hint and constraint intake

- Read `references/cairo-checklist.md`
- Execute `workflows/hint-review.md`
- Treat every hint output as hostile until constrained

### Phase 2: Arithmetic and builtin review

- Check felt252 operations for silent overflow/wrapping
- Verify range_check usage covers all untrusted values
- Verify builtin arity and output validation

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize unvalidated hints, missing range checks, storage collisions

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a Cairo-specific handoff that includes:

- The hint functions, felt252 operations, or builtins involved
- The exact validation or constraint gap under review
- Whether the issue is hint-level, arithmetic, builtin, or compiler related
- The next verification or reporting route

## Reference Index

- [references/cairo-checklist.md](references/cairo-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/hint-review.md](workflows/hint-review.md)
