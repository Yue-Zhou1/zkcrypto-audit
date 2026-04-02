---
name: commitment-scheme-auditor
description: >
  Audit polynomial commitment schemes (KZG, FRI, IPA, Pedersen) for degree
  bound enforcement, evaluation proof verification, trusted setup provenance,
  and batch opening soundness.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# commitment-scheme-auditor

Domain auditor for polynomial commitment correctness and soundness assumptions.

## When to Use

- Reviewing KZG, FRI, IPA, or Pedersen commitment implementations
- Auditing degree bound checks and evaluation proof verification logic
- Checking trusted setup provenance and SRS handling
- Reviewing batch opening/random-combination security assumptions

## When NOT to Use

- Hash primitive parameter audits without commitment verifier context
- Generic transcript concerns with no commitment operation on path
- Marking suspected commitment issues as confirmed without verification gates

## Core Review Areas

1. Degree bound enforcement on committed polynomials
2. Evaluation proof verification at correct points and values
3. Trusted setup and parameter provenance integrity
4. Batch opening randomness and binding
5. Scheme-specific checks (FRI query schedule, IPA generator independence)

## Workflow

### Phase 1: Scheme and parameter inventory

- Read `references/commitment-checklist.md`
- Identify commitment scheme(s), parameter sets, and verifier pathways
- Mark any dynamic or external parameter loading points

### Phase 2: Opening verification review

- Execute `workflows/kzg-review.md`
- Verify opening equations, evaluation point ownership, and transcript binding
- Check degree bound checks occur before accepting commitment/opening tuples

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize missing degree checks, premature challenge derivation, and untrusted setup loads

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce a commitment-audit handoff that includes:

- The scheme variant (KZG/FRI/IPA/Pedersen) and proof path involved
- The exact bound, opening, or setup integrity gap
- Whether the issue affects soundness, completeness, or configuration trust
- The next verification or reporting route

## Reference Index

- [references/commitment-checklist.md](references/commitment-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/kzg-review.md](workflows/kzg-review.md)
