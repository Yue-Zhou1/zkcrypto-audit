---
name: pqc-kem-auditor
description: >
  Audit standardized post-quantum KEM implementations — currently ML-KEM /
  FIPS 203 — for encapsulation/decapsulation conformance, implicit-rejection
  correctness, ciphertext and key validation, compression/rounding, and
  decapsulation-failure oracle resistance. Use when reviewing ML-KEM/Kyber
  APIs, serialization, or decapsulation paths.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# pqc-kem-auditor

Domain auditor for concrete, standardized post-quantum KEMs. The current
scope is ML-KEM (FIPS 203) only; other KEMs get added with their own
primary sources and fixtures rather than by analogy.

Boundary with `lattice-auditor`: that skill owns generic LWE/RLWE parameter
and noise-sampler reasoning (custom constructions, security estimates);
this skill owns the standardized KEM's API, state, serialization, and
decapsulation conformance.

## When to Use

- Auditing ML-KEM-512/768/1024 (Kyber) encapsulation/decapsulation code
- Reviewing the Fujisaki-Okamoto transform implementation: re-encryption
  comparison and implicit rejection
- Reviewing ciphertext/public-key/secret-key encoding, modulus checks, and
  compression/rounding
- Assessing decapsulation-failure oracles and constant-time reject paths
- Checking parameter-set and spec-version provenance (FIPS 203 final vs
  draft vs round-3 Kyber)

## When NOT to Use

- Generic LWE/RLWE parameter soundness, custom lattice schemes, noise
  sampling design -> `lattice-auditor`
- Post-quantum signatures (ML-DSA, SLH-DSA, Falcon, XMSS/LMS) -> the
  lattice/PQ signature review path
- Classical KEM/hybrid TLS integration questions -> `encryption-scheme-auditor`
  for the symmetric side plus this skill for the KEM side
- Timing leakage measurement methodology -> `side-channel-auditor`

## Core Review Areas

1. Version/parameter provenance: FIPS 203 final vs CRYSTALS-Kyber round-3
   differences (domain separation of K derivation, hash choices); the
   parameter set (512/768/1024) matches the claimed category
2. Input validation: public-key modulus check (encoded coefficients < q),
   ciphertext length/type checks, secret-key hash consistency (FIPS 203
   §7.2/§7.3 input checking)
3. Encapsulation: m sampled from an approved RBG, K derived exactly per
   spec, no K exposure before ciphertext output
4. Decapsulation and implicit rejection: re-encrypt and compare; on
   mismatch return K-bar = J(z || c) with NO observable difference from
   success (no error return, no timing/branch difference, no logging)
5. Compression/rounding: Compress/Decompress rounding per spec; off-by-one
   rounding changes failure probability and interop
6. Failure-oracle resistance: nothing (timing, errors, retries, metrics)
   distinguishes implicit rejection from success across many queries
7. State and key lifecycle: z randomness quality, secret-key zeroization,
   no seed reuse across keypairs

## Workflow

### Phase 1: Version and parameter mapping

- Read `references/pqc-kem-checklist.md`
- Pin the spec version and parameter sets; queue `spec-delta-checker` if
  the code claims FIPS 203 conformance

### Phase 2: Decapsulation review

- Execute `workflows/kem-decapsulation-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize explicit-failure decapsulation, missing modulus checks, and
  round-3/FIPS derivation mixing

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route parameter/noise design questions to `lattice-auditor` and
  timing measurement to `side-channel-auditor`

## Output Contract

Produce a KEM handoff that includes:

- `kem_family_and_parameter_set`
- `encapsulation_or_decapsulation_path`
- `failure_oracle_invariant`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/pqc-kem-checklist.md](references/pqc-kem-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/kem-decapsulation-review.md](workflows/kem-decapsulation-review.md)
