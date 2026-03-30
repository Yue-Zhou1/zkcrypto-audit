---
name: ecc-pairing-auditor
description: >
  Audit elliptic-curve, pairing, and BLS signature code for point-validation,
  subgroup, serialization, DST, and pairing-equation failures. Use when
  reviewing deserialization, `hash_to_curve`, aggregate verification, or batch
  pairing logic.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# ecc-pairing-auditor

Domain auditor for elliptic-curve arithmetic, point parsing, and pairing-based
verification.

## When to Use

- Auditing BLS signatures, aggregate signatures, pairings, or curve arithmetic code
- Reviewing deserialization and external-point handling
- Checking `hash_to_curve`, DST separation, or G1/G2 role consistency
- Reviewing batched pairing verification or optimized multi-pairing paths

## When NOT to Use

- Building initial protocol context for a new codebase
- Reviewing ZK circuit constraints or transcript construction
- Declaring a suspected curve bug confirmed without verification

## Core Review Areas

1. Point validity, subgroup membership, and encoding
2. Scalar/cofactor/coordinate correctness
3. Pairing equation and group-role consistency
4. Hash-to-curve, DST, and batch verification behavior

## Workflow

### Phase 1: Point and scalar intake

- Read `references/ecc-checklist.md`
- Execute `workflows/deserialization-review.md`
- Treat every external point, scalar, and compressed encoding as hostile until validated

### Phase 2: Pairing and aggregation review

- Read `references/pairing-checklist.md`
- Execute `workflows/pairing-review.md`
- Check rogue-key resistance, pairing direction, final exponentiation, and batching semantics

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize subgroup bugs, non-canonical encodings, batch masking, and optimized-backend divergence

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a curve/pairing handoff that includes:

- The points, groups, encodings, and pairing equations involved
- The exact validation or batching gap under review
- Whether the issue is parser-level, arithmetic, DST, or aggregation related
- The next verification or reporting route

## Reference Index

- [references/ecc-checklist.md](references/ecc-checklist.md)
- [references/pairing-checklist.md](references/pairing-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/deserialization-review.md](workflows/deserialization-review.md)
- [workflows/pairing-review.md](workflows/pairing-review.md)
