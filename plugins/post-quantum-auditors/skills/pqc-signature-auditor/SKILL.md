---
name: pqc-signature-auditor
description: >
  Audit post-quantum signature implementations — ML-DSA (FIPS 204), SLH-DSA
  (FIPS 205), FN-DSA/Falcon (pending standardization), and stateful hash
  signatures XMSS/LMS/HSS (NIST SP 800-208) — for rejection-sampling
  correctness, hedged/deterministic signing modes, verification bound
  enforcement, and one-time-signature state management. Use when reviewing
  PQ signing, verification, or OTS index/state persistence.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# pqc-signature-auditor

Domain auditor for standardized post-quantum signatures, in two families
with different failure modes: stateless schemes (ML-DSA, SLH-DSA, FN-DSA)
where the risks are sampling and bound enforcement, and stateful hash-based
schemes (XMSS/LMS/HSS) where the dominant risk is one-time-key state reuse.

Do not fold ML-KEM/Kyber findings into this skill — KEM review belongs to
`pqc-kem-auditor`.

## When to Use

- Auditing ML-DSA (FIPS 204) signing/verification: rejection sampling,
  hint computation, deterministic vs hedged modes
- Auditing SLH-DSA (FIPS 205): FORS/WOTS+ structure, addressing, and
  randomizer handling
- Auditing FN-DSA/Falcon implementations (with its standardization status
  pinned in source notes — FIPS 206 not yet final)
- Auditing XMSS/LMS/HSS under NIST SP 800-208: OTS index monotonicity,
  crash recovery, backup/restore, cloning, and hardware-binding
  requirements

## When NOT to Use

- ML-KEM/Kyber or any KEM decapsulation review -> `pqc-kem-auditor`
- Classical signatures (ECDSA, Schnorr, EdDSA, RSA) ->
  `signature-scheme-auditor`
- Generic lattice parameter/noise design for custom schemes ->
  `lattice-auditor`
- Timing measurement methodology for samplers -> `side-channel-auditor`

## Core Review Areas

1. Parameter-set and version provenance: FIPS 204/205 final vs round-3
   Dilithium/SPHINCS+ differences; Falcon flagged as pre-standard
2. ML-DSA signing: rejection-sampling loop exactness (norm checks on z,
   r0, hint count), iteration bounds, and no leakage of rejected
   candidates
3. Signing modes: deterministic vs hedged (rnd) handling per FIPS 204;
   SLH-DSA opt_rand per FIPS 205; fault posture of deterministic modes
4. Verification bounds: every norm/weight/count bound checked (z bound,
   hint weight, FORS/WOTS checksum rules) — skipping any bound admits
   forgery
5. Stateful OTS index management (XMSS/LMS/HSS): monotonic persistent
   counter committed BEFORE signature release, crash recovery, backups,
   replication, and SP 800-208 hardware-binding requirements
6. Encoding/serialization: canonical encodings, length checks, context
   strings (FIPS 204/205 ctx parameter) bound correctly

## Workflow

### Phase 1: Family and version mapping

- Read `references/pqc-signature-checklist.md`
- Pin the scheme, parameter set, and spec version; queue
  `spec-delta-checker` for conformance claims

### Phase 2: Family-specific review

- Stateless (ML-DSA, SLH-DSA, FN-DSA): execute
  `workflows/pqc-signature-review.md`
- Stateful (XMSS/LMS/HSS): execute
  `workflows/stateful-hash-signature-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize skipped verification bounds, rejection-loop shortcuts, and
  OTS index rollback paths

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route sampler leakage to `side-channel-auditor`, RNG lifecycle to
  `randomness-auditor`, KEM questions to `pqc-kem-auditor`

## Output Contract

Produce a PQ-signature handoff that includes:

- `signature_family_and_parameter_set`
- `sign_or_verify_path`
- `state_or_sampling_invariant`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/pqc-signature-checklist.md](references/pqc-signature-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/pqc-signature-review.md](workflows/pqc-signature-review.md)
- [workflows/stateful-hash-signature-review.md](workflows/stateful-hash-signature-review.md)
