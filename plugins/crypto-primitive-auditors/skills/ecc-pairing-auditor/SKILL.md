---
name: ecc-pairing-auditor
description: >
  Audit elliptic-curve, pairing, and BLS signature code for point-validation,
  subgroup and cofactor, serialization, DST, rogue-key, and pairing-equation
  failures. Use when reviewing point or scalar deserialization,
  `hash_to_curve`, proof-of-possession handling, aggregate verification, or
  batch pairing logic.
allowed-tools: Read Grep Glob Bash
---

# ecc-pairing-auditor

Domain auditor for elliptic-curve arithmetic, point parsing, and pairing-based
verification.

**Core principle:** group and pairing equations mean something only for
elements of the intended prime-order group. A byte string is not one until
the code has shown it is canonical, on the curve, and in the subgroup.

## When to Use

- Auditing BLS signatures, aggregate signatures, pairings, or curve code
- Reviewing deserialization and external-point handling
- Checking `hash_to_curve`, DST separation, or G1/G2 role consistency
- Reviewing batched pairing verification or optimized multi-pairing paths
- Reviewing proof-of-possession and other rogue-key defences

## When NOT to Use

- ECDSA, Schnorr, or EdDSA verification semantics and malleability ->
  `signature-scheme-auditor`
- EVM precompile encoding and call sites (EIP-196/197/2537) ->
  `ethereum-crypto-auditor`, `onchain-verifier-auditor`
- DKG, threshold signing, and key-share handling -> `dkg-threshold-auditor`
- KZG and other polynomial-commitment opening logic built on pairings ->
  `commitment-scheme-auditor`
- Reviewing ZK circuit constraints -> `zk-circuit-auditor`; transcript
  construction -> `fiat-shamir-auditor`
- Building initial protocol context -> `crypto-audit-context`
- Declaring a suspected curve bug confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The library's deserializer validates the point" | Which checks run depends on the library, the function, and the version. Unchecked variants exist beside the checked ones, and some decoders check the curve equation but leave group membership to a separate call. Read the function that is actually called |
| "It is on the curve, so it is in the group" | Only when the cofactor is 1 (secp256k1, P-256, BN254 G1). BN254 G2, both BLS12-381 groups, and Curve25519/edwards25519 have cofactor above 1, and on-curve points outside the prime-order subgroup exist |
| "A bad point would just make the pairing check fail" | The pairing is specified on the prime-order groups. Outside them the result depends on the implementation, so verifiers can disagree on validity; the BLS draft warns this may enable forgeries, and that even a well-behaved pairing loses strong unforgeability without the subgroup check |
| "Aggregation is only point addition; proof of possession is a registration detail" | Without it an attacker registers `pk' = [x]G - pk_victim`, the aggregate collapses to `[x]G`, and the attacker signs alone for both. Every key in an aggregate needs a verified PoP or the scheme must use message augmentation |
| "Random-coefficient batching is equivalent to verifying each item" | Only if the coefficients are unpredictable to whoever chose the items, nonzero, wide enough for the claimed soundness, and drawn after every item is fixed. Each point still needs its own subgroup check |
| "The identity is a valid group element" | An identity public key with an identity signature satisfies the BLS equation for every message. Key validation must reject it, and an aggregate key that sums to identity must be rejected too |

## Core Review Areas

1. Point validity, subgroup membership, and encoding
2. Scalar/cofactor/coordinate correctness, per curve family
3. Identity and exceptional-case handling; invalid-curve and twist exposure
4. Pairing equation and group-role consistency, final exponentiation
5. Hash-to-curve, DST, and batch verification behavior
6. BLS key validation, proof of possession, and aggregation semantics
7. Optimized backend equivalence with the reference path

## Workflow

### Phase 1: Point and scalar intake

- Read `references/ecc-checklist.md`
- Execute `workflows/deserialization-review.md`
- Treat every external point, scalar, and compressed encoding as hostile
  until validated

### Phase 2: Pairing and aggregation review

- Read `references/pairing-checklist.md`
- Execute `workflows/pairing-review.md`
- Check rogue-key resistance, pairing direction, final exponentiation, and
  batching semantics

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize subgroup bugs, non-canonical encodings, batch masking, and
  optimized-backend divergence

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route signature semantics to `signature-scheme-auditor`, precompile
  encoding to `ethereum-crypto-auditor` or `onchain-verifier-auditor`, and
  threshold or DKG logic to `dkg-threshold-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

## Output Contract

Produce a curve/pairing handoff listing each candidate with:

- `curve_and_group` (the points, groups, and encodings involved)
- `intake_or_equation_path` (the parser call site or pairing equation)
- `validation_or_batching_gap` (the exact check that is missing or wrong)
- `issue_class` (`parser`, `arithmetic`, `dst`, or `aggregation`)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/ecc-checklist.md](references/ecc-checklist.md)
- [references/pairing-checklist.md](references/pairing-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/deserialization-review.md](workflows/deserialization-review.md)
- [workflows/pairing-review.md](workflows/pairing-review.md)
