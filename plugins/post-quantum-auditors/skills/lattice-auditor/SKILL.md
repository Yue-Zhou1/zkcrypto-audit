---
name: lattice-auditor
description: >
  Audit generic and non-standardized lattice cryptography (LWE, RLWE, MLWE,
  LWR, SIS, NTRU) for parameter security estimates, secret and error
  distributions, sampler correctness (CBD, discrete Gaussian, rejection),
  seed separation, modulus and NTT arithmetic, decryption-failure
  probability, key and public-value validation, and key-reuse or reaction
  attacks. Use when reviewing a custom lattice scheme, a lattice
  commitment or proof, or lattice parameters chosen outside a standard.
allowed-tools: Read Grep Glob Bash
---

# lattice-auditor

Domain auditor for lattice constructions that no standard pins down:
custom encryption, key exchange, signatures, commitments, and proofs on
LWE-family, SIS, or NTRU assumptions, with their samplers and arithmetic.

**Core principle:** security and correctness are joint properties of the
dimension, modulus, and exact distributions. Change one and redo both.

## When to Use

- Auditing LWE/RLWE/MLWE/SIS/NTRU parameter sets and claimed security levels
- Reviewing noise and distribution sampling and rejection-sampling code
- Checking seed and domain separation and key derivation paths
- Reviewing modular reduction, NTT, and polynomial multiplication
- Validating decryption-failure assumptions, public-value checks, and
  decapsulation behavior of non-standardized schemes
- Assessing key reuse and reaction attacks

## When NOT to Use

- ML-KEM/Kyber (FIPS 203) conformance and decapsulation -> `pqc-kem-auditor`
- ML-DSA, Falcon/FN-DSA, and hash-based signatures -> `pqc-signature-auditor`
- FHE noise budgets, key switching, bootstrapping -> `fhe-auditor`
- Timing measurement of samplers and reject paths -> `side-channel-auditor`
- RNG and DRBG seeding and lifecycle -> `randomness-auditor`
- Fiat-Shamir transcript binding in lattice proofs -> `fiat-shamir-auditor`
- ECC-only code with no lattice construct -> `ecc-pairing-auditor`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The estimator reports 128 bits" | For which instance? An estimate run with a dense secret, the wrong sample count, or without hybrid and dual attacks does not describe a scheme that samples sparse ternary secrets. Re-run it with the constants in the code |
| "These are Kyber's parameters with one small change" | The standard's security and failure analyses cover its exact tuple. A different modulus, error width, or compression setting voids both |
| "Decryption failures are rare, so they are an availability issue" | Failures correlate with the secret. With a reused key, an attacker who sees which ciphertexts fail accumulates information and can craft ciphertexts that fail more often |
| "The sampler output looks right in a histogram" | A histogram does not show a tail cut too early, a small modulo bias, or value-dependent timing. The proofs assume the exact distribution, and attacks on lattice signature samplers have recovered keys from small per-signature leaks accumulated over many signatures |
| "Keys are ephemeral, so reuse and validation do not matter" | Check the code, not the intent: key caching and static modes are common, and key-reuse attacks on passively secure RLWE key exchange recover the secret in a modest number of queries |
| "The NTT round-trips, so the arithmetic is correct" | A forward and inverse transform built from the same wrong table still invert each other. Only comparison against schoolbook multiplication, on boundary inputs, tests the product |

## Core Review Areas

1. Parameter-set provenance and claimed security margins, reproduced for
   the instance in the code
2. Distribution and noise sampling correctness and bias control
3. Domain separation for seeds and derivation contexts
4. Modulus arithmetic: reduction ranges, NTT roots and ordering, domains
5. Decryption failure bounds and constant-time decoding boundaries
6. Key and public-value validation, and norm bounds in verification
7. KEM decapsulation checks and reject-path correctness
8. Key lifetime, reuse, and reaction attacks

## Workflow

### Phase 1: Parameter and provenance intake

- Read `references/lattice-checklist.md`
- Classify the construction, confirm no sibling skill owns it, and map
  claimed scheme parameters to concrete code constants

### Phase 2: Parameter, sampling, and failure-path review

- Execute `workflows/parameter-review.md`: sampling and rejection paths,
  decryption-failure assumptions, strict constant-time reject paths

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize sampling bias, seed reuse, failure-bound underestimation, and
  missing norm or range checks

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route sampler and reject-path timing to `side-channel-auditor`,
  RNG lifecycle to `randomness-auditor`, deviations from the defining
  paper to `spec-delta-checker`
- Recommend `differential-test-harness-gen` or `kani-harness-gen` to the
  user when arithmetic evidence is thin; do not run them

## Output Contract

Produce a lattice handoff listing each candidate with:

- `construction_and_parameter_set`
- `affected_path` (sampler, arithmetic routine, decoding, or decapsulation)
- `issue_class` (`parameter`, `sampling`, `seed_separation`, `arithmetic`,
  `failure_bound`, `validation`, `reject_path`, or `reuse`)
- `bound_or_bias_at_risk` (concrete failure bound or bias condition)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/lattice-checklist.md](references/lattice-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/parameter-review.md](workflows/parameter-review.md)
