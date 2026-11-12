# lattice-auditor Finding Patterns

## P1: Rejection sampling bias leaks structure

- **Pattern:** the acceptance test uses a wrong bound, skips a norm check,
  or releases material derived from a rejected candidate.
- **Impact:** outputs depend on the secret; recovery from enough samples.

## P2: Decryption failure probability underestimated

- **Pattern:** implemented distributions, compression, or modulus differ
  from the analysis, or the analysis omits a rounding term.
- **Impact:** failure rate above the claim; with reused keys, failures
  become a key-recovery signal.

## P3: Seed reuse across public and secret derivations

- **Pattern:** the public-matrix seed also feeds secret or error sampling,
  or two secret-distribution outputs share (seed, nonce).
- **Impact:** secrets derivable from public data; identical secret and
  error turn the public key into a solvable linear system.

## P4: Rounding or compression mismatch between spec and code

- **Pattern:** rounding direction, tie-breaking, or bit width in encode
  and decode differs from the proven construction.
- **Impact:** changed failure probability and broken interoperability.

## P5: Decapsulation reject path leaks a side-channel signal

- **Pattern:** malformed or mismatching ciphertexts take a different
  branch, error, or time than valid ones.
- **Impact:** a failure oracle against the secret key.

## P6: Security estimated for a different instance

- **Pattern:** the estimate assumes dense secrets and few samples; the
  code has sparse secrets, many samples, or a very narrow error.
- **Impact:** hybrid or algebraic attacks beat the claimed level.

## P7: Biased or truncated sampler

- **Pattern:** `% q` on too few bits, a Gaussian table cut short or stored
  with too little precision, or CBD bit extraction that overlaps.
- **Impact:** the distribution the proof assumes is not the one sampled.

## P8: Arithmetic wrong on boundary inputs

- **Pattern:** lazy reduction overflows for near-maximal coefficients, or
  NTT tables use a wrong root or ordering that round-trip tests miss.
- **Impact:** wrong products for specific, possibly attacker-chosen, inputs.

## P9: Key reuse in a passively secure scheme

- **Pattern:** a key pair meant to be ephemeral is cached or static with
  no re-encryption check.
- **Impact:** key-mismatch and reaction attacks recover the secret.

## P10: Unvalidated public value

- **Pattern:** out-of-range coefficients are silently reduced, wrong
  dimensions accepted, or degenerate keys and ciphertexts not rejected.
- **Impact:** non-canonical encodings, malleability, chosen-input leaks.

## P11: Missing norm bound in verification

- **Pattern:** a signature, opening, or proof response is accepted with no
  norm check, or against a bound at or above the modulus.
- **Impact:** forgery or broken binding; SIS is trivial without the bound.

## P12: Preimage sampler leaks the secret basis

- **Pattern:** hash-and-sign with deterministic rounding against the
  trapdoor instead of a proper Gaussian sampler.
- **Impact:** signatures reveal the basis (Nguyen-Regev).
