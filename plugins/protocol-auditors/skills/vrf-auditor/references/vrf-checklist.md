# vrf-auditor Checklist

All section references are to RFC 9381 unless noted.

## Construction identification

- [ ] The exact construction is pinned: RSA-FDH-VRF (§4) or ECVRF (§5),
      and for ECVRF the ciphersuite ID (§5.5: ECVRF-P256-SHA256-TAI,
      ECVRF-EDWARDS25519-SHA512-TAI, ECVRF-EDWARDS25519-SHA512-ELL2, etc.).
      Checks below differ per suite; a "generic" VRF claim is itself a
      finding.

## Key validation (§5.4.5, §3 security levels)

- [ ] ECVRF verifiers that need full uniqueness / full collision
      resistance against ADVERSARIAL keys run validate_key: decode Y,
      reject identity and small-order components (cofactor > 1 curves).
      Trusted-uniqueness deployments must document that keys are
      registered/attested.
- [ ] RSA-FDH-VRF keys: modulus size per policy; e sanity; the verifier
      uses the registered key, not one supplied in-band.

## Domain separation (§4.1, §5.4.1.x, §5.4.3)

- [ ] The suite_string is the ciphersuite's registered octet and prefixes
      every hash invocation the RFC prescribes (encode_to_curve,
      challenge_generation, proof_to_hash, nonce_generation as
      applicable).
- [ ] Separation front/back octets (e.g., 0x01/0x00 in proof_to_hash,
      0x02 in challenge generation, encode_to_curve domain separators)
      match the RFC exactly — off-by-one constants silently produce a
      different, non-interoperable VRF whose outputs still "look" fine.
- [ ] No reuse of the VRF hash context for non-VRF protocol hashing.

## encode_to_curve (§5.4.1)

- [ ] TAI suites: try_and_increment loops with ctr, uses the specified
      salt (public key string), and rejects low-order/invalid candidates
      per the suite; the loop bound and interpretation match the RFC.
- [ ] ELL2 / RFC 9380 suites: hash_to_curve called with the exact DST from
      the ciphersuite definition; no truncation or homemade DST.

## Prover nonce (§5.4.2)

- [ ] The proving nonce k derives deterministically from the secret key
      and input per the suite (RFC 6979-style for P-256; RFC 8032-style
      hashing for edwards25519).
- [ ] k is never reused across different alpha inputs; any caching,
      retry, or RNG substitution routes to `randomness-auditor` — a
      single k reuse across two inputs reveals the secret key exactly as
      in Schnorr/ECDSA.

## Verification and proof_to_hash (§5.3, §5.4.4, §5.2)

- [ ] RSA-FDH-VRF: reject a proof representative outside the modulus, apply
      RSAVP1, and compare its result exactly to the suite-string/MGF1
      representative. Do not apply RSASSA/PKCS#1 padding-parser rules.
- [ ] decode_proof validates Gamma, c, s ranges/encodings and fails on
      malformed components.
- [ ] The verification equations recompute U = s*B - c*Y and
      V = s*H - c*Gamma and re-derive c from the challenge hash — all
      components, no shortcuts.
- [ ] proof_to_hash multiplies Gamma by the cofactor before hashing
      (§5.2 cofactor * Gamma); skipping cofactor clearing lets related
      Gamma values in the same coset produce different betas for small-
      order-tainted keys.
- [ ] Beta is computed only from proofs that verified. Any API that
      exposes proof_to_hash independently of verify must be documented
      as UNSAFE for untrusted proofs (§5.2 note).

## Uniqueness, pseudorandomness, and application use (§3, §7)

- [ ] The application's required property is identified: full uniqueness
      (adversarial keys) vs trusted uniqueness; the ciphersuite and key
      validation actually deliver it.
- [ ] Pseudorandomness caveat: outputs are pseudorandom only for
      honestly-generated, secret keys — a participant who knows their key
      can predict their own outputs; protocols must account for it (§3.3).
- [ ] Grinding resistance: participants cannot re-key cheaply to bias
      selection (key registration deadlines before the input/epoch seed is
      known); cannot choose alpha after seeing others' outputs; and
      withholding (not revealing an unfavorable output) is either
      detectable or economically punished (§7.3 selective-abort style
      bias).
- [ ] Output truncation by the consumer keeps enough bits for the claimed
      selection fairness.
