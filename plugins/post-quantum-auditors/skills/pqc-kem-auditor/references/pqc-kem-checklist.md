# pqc-kem-auditor Checklist

Scope: ML-KEM per FIPS 203 (final, August 2024). Section references are to
FIPS 203.

## Version and parameter provenance

- [ ] The implementation states which spec it implements: FIPS 203 final
      differs from round-3 CRYSTALS-Kyber (e.g., no hash of the message m
      before use in K derivation in final ML-KEM.Encaps; the shared-secret
      derivation changed between draft/round-3 and final). Mixed derivations
      produce interoperable-looking but wrong shared secrets.
- [ ] Parameter set (ML-KEM-512/768/1024) matches the claimed security
      category (1/3/5) and is not runtime-negotiable below policy.
- [ ] Known-answer tests come from the FIPS 203 final vectors (or
      ACVP), not stale round-3 KATs.

## Input checking (§7.2, §7.3)

- [ ] Encapsulation input check: the encoded public key's coefficients are
      verified < q (ek type check / modulus check); reject otherwise.
- [ ] Decapsulation input checks: ciphertext byte length matches the
      parameter set; dk length and (where the API keeps the hash) the
      internal consistency of the decapsulation key.
- [ ] APIs that skip input checks "because the caller validated" are
      findings — the checks are normative Encaps/Decaps preconditions.

## Encapsulation (§7.2 ML-KEM.Encaps)

- [ ] m comes from an approved RBG with >= 256 bits of strength; no
      caller-supplied or deterministic m outside test hooks, and the
      derandomized test API cannot be reached in production.
- [ ] (K, r) = G(m || H(ek)) exactly — the hash of the encapsulation key
      binds K to the recipient key (contributory behavior).
- [ ] K is not observable (logs, errors, partial writes) before c is
      successfully produced.

## Decapsulation and implicit rejection (§7.3 ML-KEM.Decaps)

- [ ] Full re-encryption check: m' decrypted, (K', r') re-derived, c'
      recomputed and compared to c — comparison over the WHOLE ciphertext,
      constant-time.
- [ ] On mismatch, output K-bar = J(z || c) (the implicit-rejection key):
      no error return, no exception, no distinguishable timing/branching,
      no metrics or log line. Any explicit failure signal converts the
      CCA transform back into a chosen-ciphertext oracle.
- [ ] z is a per-keypair secret from keygen; never all-zero, never shared
      across keypairs, stored/zeroized with the secret key.
- [ ] The comparison and the select-between-K-and-K-bar are branchless
      (constant-time select), including in the "optimized" paths.

## Encoding, compression, rounding (§4.2.1)

- [ ] ByteEncode/ByteDecode widths per parameter set; Decompress/Compress
      use the spec's rounding (round-half-up on the rational, implemented
      via the exact integer formula) — off-by-one rounding silently
      changes decryption-failure behavior and cross-implementation
      agreement.
- [ ] No acceptance of trailing bytes or over-long encodings.

## Failure-oracle resistance (holistic)

- [ ] Across MANY decapsulations of attacker-crafted ciphertexts, nothing
      observable correlates with the internal success/reject bit: timing,
      cache behavior of the reject path, downstream protocol behavior
      (e.g., using K vs K-bar must both proceed to the same AEAD attempt
      shape), retry counters, error telemetry.
- [ ] Downstream protocol treats a garbage shared secret as a normal
      AEAD failure indistinguishable from network corruption.

## Key lifecycle

- [ ] Keygen seed (d, z) from approved RBG; dk zeroized on destruction;
      no seed logging or checkpointing (cross-route lifecycle mechanics to
      `randomness-auditor` / `rust-crypto-safety`).
