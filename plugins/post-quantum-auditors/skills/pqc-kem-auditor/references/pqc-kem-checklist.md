# pqc-kem-auditor Checklist

Scope: ML-KEM per FIPS 203 (final, August 2024). Section references are to
FIPS 203.

## Version and parameter provenance

- [ ] The implementation states which spec it implements: FIPS 203 final
      differs from round-3 CRYSTALS-Kyber (e.g., no hash of the message m
      before use in ML-KEM.Encaps; no hash of the ciphertext in the
      shared-secret derivation; fixed 256-bit K) and from the initial
      public draft (domain separation in K-PKE.KeyGen, matrix index order)
      — see Appendix C. Mixed derivations produce interoperable-looking
      but wrong shared secrets.
- [ ] Parameter set (ML-KEM-512/768/1024) matches the claimed security
      category (1/3/5) and is not runtime-negotiable below policy.
- [ ] Known-answer tests come from the FIPS 203 final vectors (or
      ACVP), not stale round-3 KATs.

## Input checking (§7.2, §7.3)

- [ ] Encapsulation input check: ek has length 384k + 32 (type check) and
      its encoded coefficients are verified < q (modulus check:
      ByteEncode12(ByteDecode12(ek[0:384k])) equals the input); reject
      otherwise.
- [ ] Decapsulation input checks: ciphertext byte length 32(d_u*k + d_v)
      matches the parameter set; dk length is 768k + 96; hash check
      H(dk[384k : 768k+32]) equals dk[768k+32 : 768k+64].
- [ ] The checks are normative Encaps/Decaps preconditions. FIPS 203
      lets the ek and dk checks be done once or by another party when
      assurance is obtained by other means (SP 800-227), but the
      ciphertext check is required on every Decaps. A skipped check
      "because the caller validated" with no such assurance is a finding.

## Encapsulation (§7.2 ML-KEM.Encaps)

- [ ] m is 32 fresh bytes from an approved RBG with security strength of
      at least 128/192/256 bits for ML-KEM-512/768/1024 (§3.3, Table 2);
      no caller-supplied or deterministic m outside test hooks, and the
      derandomized test API cannot be reached in production.
- [ ] (K, r) = G(m || H(ek)) exactly (ML-KEM.Encaps_internal, §6.2) — the
      hash of the encapsulation key binds K to the recipient key
      (contributory behavior).
- [ ] K is not observable (logs, errors, partial writes) before c is
      successfully produced.

## Decapsulation and implicit rejection (§7.3 ML-KEM.Decaps)

- [ ] Full re-encryption check (ML-KEM.Decaps_internal, §6.3): m'
      decrypted, (K', r') re-derived, c' recomputed and compared to c —
      comparison over the WHOLE ciphertext, constant-time.
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
