# pqc-signature-auditor Finding Patterns

## P1: OTS index reuse (stateful schemes)

- **Pattern:** XMSS/LMS index persisted after signature release,
  restored from backup, or shared by replicated signers.
- **Impact:** two signatures under one OTS key — forgery becomes
  practical (the one-time property is the entire security argument).
  This is the highest-severity pattern in this skill.

## P2: Skipped verification bounds (ML-DSA)

- **Pattern:** verifier checks the equation but not ||z|| bounds or hint
  weight; "the reference code did it, we optimized it out."
- **Impact:** signature forgery via out-of-bound responses; a missing
  malformed-hint check in hint unpacking loses strong unforgeability
  (FIPS 204 Appendix D.2).

## P3: Rejection-loop shortcuts (ML-DSA)

- **Pattern:** missing z/r0/ct0 checks, capped loop that returns the last
  candidate on exhaustion, or per-rejection secret-dependent timing.
- **Impact:** with the z or r0 check missing or weakened, signatures leak
  secret-key information across many signatures (statistical key
  recovery); the ct0 and hint-count checks are there for correctness, so
  skipping them yields signatures that can fail verification; returning
  unvetted candidates breaks the zero-knowledge of the sampling.

## P4: Deterministic signing in fault-exposed environments

- **Pattern:** ML-DSA deterministic mode on hardware where glitching is in
  the threat model; SLH-DSA signing on such hardware (deterministic or
  hedged) without redundant recomputation.
- **Impact:** for deterministic ML-DSA, a single fault produces nonce
  reuse and key recovery (same class as deterministic ECDSA/EdDSA
  faults); some faulted signatures still verify, so verify-after-sign
  alone is not a complete defence. For SLH-DSA, one faulted signature
  lets an attacker graft a forged subtree and forge signatures; the
  faulted signature still verifies and randomized signing does not
  prevent the attack.

## P5: ADRS/domain-separation errors (SLH-DSA)

- **Pattern:** wrong address type constants, reused addresses across
  tree layers, or homemade prehash encodings.
- **Impact:** hash-collision structure across supposedly independent
  one-time keys; forgery budget collapses.

## P6: WOTS+ checksum omission

- **Pattern:** verification recomputes chains but skips the checksum
  digits (WOTS+), or takes FORS leaf indices from anywhere other than
  the message digest (FORS has no checksum; the digest-derived index
  per tree is what binds the message).
- **Impact:** attacker advances the chains of an observed signature to
  sign a message whose digits are no smaller — direct forgery.

## P7: Falcon sampler timing

- **Pattern:** floating-point Gaussian sampler with input-dependent
  timing, or a "fixed" sampler that renormalizes differently than the
  reference.
- **Impact:** key recovery from sampler timing traces (demonstrated
  against the DLP predecessor scheme and left open for Falcon, whose
  isochronous SamplerZ is the countermeasure); floating-point
  discrepancies between two sampler runs on the same input also expose
  the key.

## P8: Round-3/final-standard mixing

- **Pattern:** Dilithium round-3 encodings with FIPS 204 parameters, ctx
  parameter ignored, or SPHINCS+ round-3 addressing with FIPS 205
  constants.
- **Impact:** interop failures and unanalyzed hybrid constructions.

## P9: Index-capacity mismanagement (stateful)

- **Pattern:** no remaining-signature accounting, wrap-around on
  exhaustion, or reservation windows larger than persisted state
  guarantees.
- **Impact:** silent index reuse at the exhaustion boundary (P1 by
  another road).
