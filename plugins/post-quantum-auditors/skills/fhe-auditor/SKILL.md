---
name: fhe-auditor
description: >
  Audit FHE implementations for noise-budget accounting, bootstrapping
  correctness, modulus-switching safety, plaintext leakage, and key-switch
  parameter integrity.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# fhe-auditor

Domain auditor for fully homomorphic encryption pipelines and transform safety.

## When to Use

- Auditing ciphertext lifecycle across FHE transforms
- Reviewing noise growth calculations and claimed depth limits
- Checking bootstrapping and key-switch correctness assumptions
- Verifying modulus switching and plaintext/ciphertext boundary handling

## When NOT to Use

- Classical encryption reviews without homomorphic transforms
- Parameter-level lattice audits that do not involve FHE lifecycle behavior
- Confirming suspected FHE issues without verification gates

## Core Review Areas

1. Ciphertext modulus transitions and switching semantics
2. Noise growth tracking and budget accounting
3. Bootstrapping parameter validity and correctness
4. Plaintext/ciphertext boundary and slot-packing isolation
5. Key-switch material provenance and application correctness

## Workflow

### Phase 1: Ciphertext lifecycle mapping

- Read `references/fhe-checklist.md`
- Execute `workflows/noise-budget-review.md`
- Map each ciphertext transform from encryption to final decrypt/consume step

### Phase 2: Noise and transform review

- Validate noise-budget calculations at each transform stage
- Confirm bootstrapping refresh logic preserves security invariants
- Verify modulus and key-switch operations do not silently degrade correctness

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize exhausted noise budgets, precision drops, and leakage boundaries

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce an FHE-specific handoff that includes:

- The ciphertext lifecycle stage and transform under review
- The measured/claimed noise budget and correctness invariant at risk
- Whether the issue is noise, bootstrapping, modulus switch, key-switch, or leakage related
- The next verification or reporting route

## Reference Index

- [references/fhe-checklist.md](references/fhe-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/noise-budget-review.md](workflows/noise-budget-review.md)
