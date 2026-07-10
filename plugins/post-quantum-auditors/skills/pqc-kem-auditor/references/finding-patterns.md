# pqc-kem-auditor Finding Patterns

## P1: Explicit decapsulation failure (broken implicit rejection)

- **Pattern:** Decaps returns an error/None/exception on re-encryption
  mismatch instead of K-bar = J(z || c).
- **Root cause:** mapping the FO transform onto an error-returning API
  convention.
- **Impact:** a chosen-ciphertext failure oracle; adaptive queries recover
  the secret key (the attack class implicit rejection exists to prevent).

## P2: Non-constant-time reject path

- **Pattern:** early-exit ciphertext comparison, branch on the mismatch
  bit, or K/K-bar selection via if/else with different memory behavior.
- **Impact:** timing/cache oracle equivalent to P1 (the "KyberSlash"-class
  and clangover-style local-timing findings).

## P3: Missing public-key modulus check

- **Pattern:** Encaps consumes ek without verifying encoded coefficients
  < q.
- **Impact:** violates the FIPS 203 input-check precondition; malformed
  keys reach arithmetic with unreduced values, producing exploitable
  cross-implementation divergence.

## P4: Round-3 / FIPS 203 derivation mixing

- **Pattern:** K derivation, G/H/J instantiation, or m preprocessing from
  round-3 Kyber combined with FIPS 203 encodings (or vice versa).
- **Impact:** silently different shared secrets between endpoints, or a
  weaker transform than the standard analyzed.

## P5: Rounding/compression off-by-one

- **Pattern:** Compress/Decompress implemented with floor/truncation
  instead of the spec's rounding formula.
- **Impact:** elevated decryption-failure rate (which is itself an oracle
  amplifier) and KAT/interop mismatches.

## P6: z misuse

- **Pattern:** implicit-rejection secret z all-zero, derived from the
  public key, shared across keypairs, or not zeroized.
- **Impact:** K-bar becomes predictable — implicit rejection degrades to
  an effective explicit oracle for anyone who knows z.

## P7: Derandomized test API reachable in production

- **Pattern:** deterministic Encaps (caller-supplied m) exported for KAT
  testing and callable from production paths.
- **Impact:** shared-secret predictability if any caller misuses it.

## P8: Downstream failure divergence

- **Pattern:** the protocol above the KEM handles "AEAD failed after
  decapsulation" differently from other failures (different retry,
  different alert, different log volume).
- **Impact:** reconstructs the decapsulation oracle at the protocol layer
  even when the KEM core is constant-time.
