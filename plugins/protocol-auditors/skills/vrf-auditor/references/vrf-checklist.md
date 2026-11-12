# vrf-auditor Checklist

All section references are to RFC 9381 unless noted.

## Construction identification

- [ ] The exact construction is pinned: RSA-FDH-VRF (§4) or ECVRF (§5),
      and for ECVRF the ciphersuite ID (§5.5: ECVRF-P256-SHA256-TAI,
      ECVRF-EDWARDS25519-SHA512-TAI, ECVRF-EDWARDS25519-SHA512-ELL2, etc.).
      Checks below differ per suite; a "generic" VRF claim is itself a
      finding.

## Key validation (§5.4.5, §3, §7.1)

- [ ] ECVRF verifiers that need full collision resistance or
      unpredictability against ADVERSARIAL keys run validate_key: decode Y,
      reject Y when cofactor * Y is the identity (small-order keys; for
      P-256 just the point at infinity).
      ECVRF has full uniqueness with or without it. Deployments relying on
      the trusted variants must document that keys are registered/attested.
- [ ] RSA-FDH-VRF keys: modulus size per policy; e sanity; the verifier
      uses the registered key, not one supplied in-band.

## Domain separation (§4.1, §5.4.1.x, §5.4.3)

- [ ] The suite_string is the ciphersuite's specified octet and prefixes
      every hash invocation the RFC prescribes (try_and_increment
      encode_to_curve, challenge_generation, proof_to_hash; the h2c suites
      carry it in the DST; nonce generation does not take it).
- [ ] Separation front/back octets (ECVRF: 0x01/0x00 in try_and_increment,
      0x02/0x00 in challenge generation, 0x03/0x00 in proof_to_hash;
      RSA-FDH-VRF: 0x01 for MGF1, 0x02 in proof_to_hash)
      match the RFC exactly — off-by-one constants silently produce a
      different, non-interoperable VRF whose outputs still "look" fine.
- [ ] No reuse of the VRF hash context for non-VRF protocol hashing.

## encode_to_curve (§5.4.1)

- [ ] TAI suites: try_and_increment loops with a one-octet ctr, uses the
      specified salt (public key string), multiplies each valid candidate
      by the cofactor, and retries on an invalid candidate or the identity;
      the point interpretation matches the suite.
- [ ] SSWU / ELL2 (RFC 9380) suites: the suite's nonuniform encode function
      (`_NU_`, not the `_RO_` hash_to_curve) is called with DST =
      "ECVRF_" || h2c_suite_ID_string || suite_string; no truncation or
      homemade DST.

## Prover nonce (§5.4.2)

- [ ] The proving nonce k derives deterministically from the secret key
      and input per the suite (RFC 6979-style for P-256; RFC 8032-style
      hashing for edwards25519).
- [ ] k is never reused across different alpha inputs; any caching,
      retry, or RNG substitution routes to `randomness-auditor` — a
      single k reuse across two inputs reveals the secret key exactly as
      in Schnorr/ECDSA.

## Verification and proof_to_hash (§4.3, §5.3, §5.4.4, §5.2)

- [ ] RSA-FDH-VRF: reject a proof representative outside the modulus, apply
      RSAVP1, and compare its result exactly to the suite-string/MGF1
      representative. Do not apply RSASSA/PKCS#1 padding-parser rules.
- [ ] decode_proof validates Gamma, c, s ranges/encodings and fails on
      malformed components.
- [ ] The verification equations recompute U = s*B - c*Y and
      V = s*H - c*Gamma and re-derive c from the challenge hash — all
      components, no shortcuts.
- [ ] proof_to_hash multiplies Gamma by the cofactor before hashing
      (§5.2 cofactor * Gamma); without it beta depends on small-order
      components of Gamma that the RFC removes before hashing, and the
      RFC's uniqueness claim no longer covers the implementation.
- [ ] Beta is computed only from proofs that verified. Any API that
      exposes proof_to_hash independently of verify must be documented
      as UNSAFE for untrusted proofs (§5.2 note).

## Uniqueness, pseudorandomness, and application use (§3, §7)

- [ ] The application's required property is identified: uniqueness,
      collision resistance, or unpredictability, each in its full
      (adversarial keys) or trusted form; the construction and key
      validation actually deliver it (ECVRF: full uniqueness always, full
      collision resistance only with validate_key; RSA-FDH-VRF: trusted
      uniqueness and trusted collision resistance only).
- [ ] Pseudorandomness caveat: outputs are pseudorandom only for
      honestly-generated, secret keys — a participant who knows their key
      can predict their own outputs; protocols must account for it (§3.4).
- [ ] Grinding resistance: participants cannot re-key cheaply to bias
      selection (key registration deadlines before the input/epoch seed is
      known); cannot choose alpha after seeing others' outputs; and
      withholding (not revealing an unfavorable output) is either
      detectable or economically punished (not covered by the RFC; see the
      Algorand and Ouroboros Praos analyses).
- [ ] Output truncation by the consumer keeps enough bits for the claimed
      selection fairness.
