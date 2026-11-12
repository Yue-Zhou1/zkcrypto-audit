---
name: vrf-auditor
description: >
  Audit Verifiable Random Function implementations (RFC 9381 ECVRF and
  RSA-FDH-VRF) for key validation, ciphersuite/suite-string domain
  separation, encode-to-curve and cofactor handling, proof-to-hash ordering,
  and uniqueness/pseudorandomness assumptions, plus application-level output
  grinding. Use when reviewing VRF provers, verifiers, or consumers of VRF
  outputs (leader election, lotteries, randomness beacons).
allowed-tools: Read Grep Glob Bash
---

# vrf-auditor

Domain auditor for VRFs: proof generation, verification, and the trust
rules consumers must follow before treating a VRF output as random.

## When to Use

- Auditing RFC 9381 ECVRF (any ciphersuite) or RSA-FDH-VRF provers and
  verifiers
- Reviewing encode_to_curve/hash_to_curve usage, cofactor handling, and
  ciphersuite/suite-string domain separation
- Reviewing proof_to_hash ordering and whether outputs are consumed before
  verification
- Assessing uniqueness (full uniqueness vs trusted-key uniqueness),
  pseudorandomness assumptions, and application-level grinding resistance

## When NOT to Use

- VDF sequential-delay proofs (Wesolowski/Pietrzak) -> `vdf-auditor`
- Ordinary signature scheme review without VRF output semantics ->
  `signature-scheme-auditor`
- Elliptic-curve point validation/subgroup mechanics in isolation ->
  `ecc-pairing-auditor`
- Nonce/CSPRNG generation mechanics -> `randomness-auditor`
- Line-by-line RFC conformance diffing -> `spec-delta-checker`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "It is a secure signature scheme, so it works as a VRF" | A VRF needs uniqueness: one output per key and input. A randomized or malleable signature lets the prover choose among outputs |
| "The proof verified, so the output is unpredictable" | Pseudorandomness is stated for honestly generated keys. Against the key holder the output is known in advance, and with adversarial keys ECVRF keeps collision resistance and unpredictability only if the key is validated, while RSA-FDH-VRF does not keep uniqueness either |
| "We verify the proof later" | An output consumed before verification is an attacker-chosen value |
| "The input is public, so there is nothing to grind" | If the prover influences the input, registers keys after it is known, or can decline to reveal, the result is biased. Fix the input before keys can change and account for withholding |
| "Cofactor handling is a detail" | RFC 9381 multiplies by the cofactor in encode-to-curve, key validation, and proof-to-hash. Dropping a step leaves small-order components in play, and the RFC's uniqueness and collision-resistance claims no longer apply |
| "Key registration is open, but every proof is checked" | Without key validation a crafted ECVRF key breaks full collision resistance and unpredictability even though each proof verifies, and RSA-FDH-VRF has only trusted uniqueness and collision resistance |

## Core Review Areas

1. Key validation: ECVRF public keys decoded and validated per the
   ciphersuite's validate_key rules (small-order/identity rejection, which
   is what gives full collision resistance and unpredictability under
   malicious key generation); RSA key sanity
2. Domain separation: suite string, DST, and challenge-generation
   separation octets exactly per RFC 9381; no cross-suite or cross-protocol
   hash reuse
3. encode_to_curve: correct method for the ciphersuite (TAI vs the
   RFC 9380 h2c suite), including the salt and loop rules
4. Cofactor handling: Gamma multiplied by the cofactor in proof_to_hash;
   verification equation component checks
5. Nonce generation in proving: RFC 9381 §5.4.2 deterministic derivation
   (RFC 6979-style / RFC 8032-style) — reuse leaks the secret key
6. proof_to_hash ordering: beta computed only from a proof that verified;
   consumers must never use outputs before verify returns VALID
7. Uniqueness, collision resistance, and pseudorandomness caveats: which
   property holds for adversarial keys under the chosen construction
   (ECVRF has full uniqueness; RSA-FDH-VRF only trusted uniqueness), and
   which the application needs
8. Application grinding: can a participant re-key, re-input, or withhold
   outputs to bias the consuming protocol (leader election, lotteries)

## Workflow

### Phase 1: Construction and ciphersuite mapping

- Read `references/vrf-checklist.md`
- Pin the exact construction (ECVRF ciphersuite ID or RSA-FDH-VRF
  parameters) and the RFC 9381 sections that govern it

### Phase 2: Prove/verify path review

- Execute `workflows/vrf-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize outputs used before verification, missing key validation,
  wrong cofactor handling, and grinding-by-withholding

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route RFC conformance deltas to `spec-delta-checker`, EC point
  rules to `ecc-pairing-auditor`, and nonce generation to
  `randomness-auditor`

## Output Contract

Produce a VRF handoff that includes:

- `vrf_family`
- `prove_or_verify_path`
- `uniqueness_or_pseudorandomness_invariant`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/vrf-checklist.md](references/vrf-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/vrf-review.md](workflows/vrf-review.md)
