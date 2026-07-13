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
- **Impact:** signature forgery via out-of-bound responses.

## P3: Rejection-loop shortcuts (ML-DSA)

- **Pattern:** missing r0/ct0 checks, capped loop that returns the last
  candidate on exhaustion, or per-rejection secret-dependent timing.
- **Impact:** signatures leak secret-key information across many
  signatures (statistical key recovery); returning unvetted candidates
  breaks the zero-knowledge of the sampling.

## P4: Deterministic signing in fault-exposed environments

- **Pattern:** ML-DSA deterministic mode / SLH-DSA deterministic opt_rand
  on hardware where glitching is in the threat model, without
  verify-after-sign.
- **Impact:** differential fault attacks recover the key from one faulted
  signature pair (same class as deterministic ECDSA faults).

## P5: ADRS/domain-separation errors (SLH-DSA)

- **Pattern:** wrong address type constants, reused addresses across
  tree layers, or homemade prehash encodings.
- **Impact:** hash-collision structure across supposedly independent
  one-time keys; forgery budget collapses.

## P6: WOTS+/FORS checksum omissions

- **Pattern:** verification recomputes chains but skips the checksum
  digits (WOTS+) or index-set consistency (FORS).
- **Impact:** attacker shifts message digits toward cheaper chain
  positions — direct forgery.

## P7: Falcon sampler timing

- **Pattern:** floating-point Gaussian sampler with input-dependent
  timing, or a "fixed" sampler that renormalizes differently than the
  reference.
- **Impact:** key recovery from timing traces (demonstrated against
  early Falcon implementations).

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
