---
name: fiat-shamir-auditor
description: >
  Audit Fiat-Shamir transcript implementations for completeness, domain
  separation, challenge derivation order, and public input binding across
  interactive-to-non-interactive proof transforms.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# fiat-shamir-auditor

Domain auditor for transcript-binding and challenge-derivation correctness.

## When to Use

- Reviewing Fiat-Shamir transforms in proof systems and signature schemes
- Auditing transcript absorb order and challenge derivation timing
- Checking public input and domain separation binding to transcript state
- Reviewing multi-round challenge dependencies in non-interactive protocols

## When NOT to Use

- Hash primitive internals when transcript behavior is not under review
- Generic circuit checks with no transcript/challenge path
- Marking suspected transcript flaws as confirmed without verification gates

## Core Review Areas

1. Transcript completeness for all prover and context messages
2. Domain separation across protocol rounds and contexts
3. Challenge derivation order and dependency correctness
4. Public input and statement binding to challenges
5. Multi-round transcript consistency and reset safety
6. Hash primitive suitability for challenge derivation

## Workflow

### Phase 1: Transcript inventory

- Read `references/fiat-shamir-checklist.md`
- Identify all absorb/squeeze operations and transcript states
- Enumerate every statement element expected to influence challenges

### Phase 2: Binding review

- Execute `workflows/transcript-binding-review.md`
- Verify commitments are absorbed before challenge derivation
- Ensure public inputs and domain labels are bound at correct points

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize frozen-heart style independence, missing absorbs, and reset bugs

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce a transcript-audit handoff that includes:

- The transcript states, labels, and challenge points involved
- The exact missing binding, absorb-order, or reset-safety issue
- Whether the issue affects soundness, replay resistance, or protocol context separation
- The next verification or reporting route

## Reference Index

- [references/fiat-shamir-checklist.md](references/fiat-shamir-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/transcript-binding-review.md](workflows/transcript-binding-review.md)
