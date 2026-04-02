---
name: noir-auditor
description: >
  Audit Noir circuits for unconstrained function boundary failures, oracle
  validation gaps, Brillig/ACIR consistency issues, and witness-generation
  soundness bugs.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# noir-auditor

Domain auditor for Noir circuits and Brillig/ACIR execution boundaries.

## When to Use

- Reviewing Noir circuits with unconstrained helper functions
- Auditing oracle calls and their constraint bindings
- Checking Brillig backend logic against ACIR semantics
- Reviewing witness generation code for proof-soundness assumptions

## When NOT to Use

- Generic ZK circuit review across multiple DSLs — use `zk-circuit-auditor`
- Cairo contracts and Starknet hint analysis — use `cairo-auditor`
- Marking a suspected issue as confirmed without verification gates

## Core Review Areas

1. Unconstrained function boundary — values crossing from Brillig to ACIR without assertion
2. Oracle safety — external oracle results trusted without constraint binding
3. Brillig vs ACIR consistency — optimized Brillig code diverging from ACIR semantics
4. Witness generation — prover-side computation producing values that do not satisfy constraints
5. Type and bounds discipline — monomorphization and indexing assumptions crossing trust boundaries

## Workflow

### Phase 1: Boundary inventory

- Read `references/noir-checklist.md`
- Execute `workflows/unconstrained-review.md`
- Enumerate every unconstrained function return that reaches constrained logic

### Phase 2: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize unconstrained boundaries, unbound oracle outputs, and Brillig/ACIR drift

### Phase 3: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a Noir-specific handoff that includes:

- The unconstrained functions, oracle paths, or Brillig/ACIR boundaries involved
- The exact missing constrained assertion or binding step
- Whether the issue is boundary, oracle, backend-consistency, or witness-generation related
- The next verification or reporting route

## Reference Index

- [references/noir-checklist.md](references/noir-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/unconstrained-review.md](workflows/unconstrained-review.md)
