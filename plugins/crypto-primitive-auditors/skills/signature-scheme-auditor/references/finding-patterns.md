# signature-scheme-auditor Finding Patterns

## P1: Missing r/s range validation (ECDSA)

- **Pattern:** verifier accepts r = 0, s = 0, or values >= n without
  rejection.
- **Impact:** depending on the arithmetic backend, crafted signatures
  verify for arbitrary messages (e.g., the Java ECDSA "psychic signatures"
  CVE-2022-21449: r = s = 0 accepted).

## P2: Ed25519 s >= L accepted

- **Pattern:** decode skips the RFC 8032 s < L check.
- **Impact:** every signature is malleable (s' = s + L); systems that
  deduplicate or consensus-key on signature bytes fork.

## P3: Batch/single verification divergence

- **Pattern:** batch path uses the cofactored equation, single path
  cofactorless (or different canonicality policy).
- **Impact:** the same signature validates in one path and not the other —
  consensus divergence between nodes taking different paths.

## P4: BIP-340 even-Y or infinity check skipped

- **Pattern:** verifier computes R = s·G - e·P and compares only R.x == r.
- **Impact:** signatures with negated R accepted; batch contexts allow
  forgeries composed from valid components.

## P5: Lenient PKCS#1 v1.5 parsing (Bleichenbacher '06)

- **Pattern:** DigestInfo parser tolerates trailing bytes, flexible
  algorithm parameters, or scans for the digest.
- **Impact:** with small public exponents, forged signatures constructed
  from perfect cubes verify without the private key.

## P6: PSS salt-length confusion

- **Pattern:** verifier accepts any salt length while policy assumes
  sLen = hLen, or hard-codes a salt length the signer doesn't use.
- **Impact:** interop failures at best; at worst a downgraded effective
  security parameter accepted silently.

## P7: Public key not validated

- **Pattern:** verification consumes attacker-supplied keys without
  on-curve/subgroup/identity checks.
- **Impact:** invalid-curve or small-subgroup interactions; identity key
  verifying everything; combined with ECDH reuse, key extraction.

## P8: Hash truncation mismatch

- **Pattern:** e computed from a different truncation of H(m) than the
  standard (rightmost bits, modular reduction instead of leftmost bits).
- **Impact:** cross-implementation signature rejection, or acceptance of
  signatures over unintended message classes.

## P9: Malleability leaking into application identity

- **Pattern:** application uses signature bytes as an identifier (txid,
  dedup key, cache key) while the scheme is malleable (high-s ECDSA,
  s+L Ed25519).
- **Impact:** transaction malleability class — replays and double-processing
  (historically: pre-BIP-62/segwit Bitcoin txid malleation).

## P10: Missing verify-after-sign where faults matter

- **Pattern:** deterministic-nonce signer (RFC 6979/EdDSA) on
  fault-susceptible hardware releases signatures unchecked.
- **Impact:** a single glitched signing computation reveals the key
  (differential fault attacks on deterministic signatures); route the
  fault analysis to implementation-safety skills.
