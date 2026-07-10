# vrf-auditor Spec Sources

## Normative

- RFC 9381 — "Verifiable Random Functions (VRFs)" (August 2023).
  Normative for both covered families: RSA-FDH-VRF (§4) and ECVRF (§5),
  including ciphersuites (§5.5), validate_key (§5.4.5), encode_to_curve
  (§5.4.1), nonce generation (§5.4.2), challenge generation (§5.4.3),
  proof_to_hash cofactor handling (§5.2), and the §3 security-property
  definitions (full vs trusted uniqueness, pseudorandomness) and §7
  security considerations this skill's grinding checks derive from.
- RFC 9380 — "Hashing to Elliptic Curves". Normative for the
  hash_to_curve/ELL2 encode_to_curve variants and DST construction rules.
- RFC 6979 / RFC 8032 — deterministic nonce derivation referenced by
  RFC 9381 §5.4.2 for the P-256 and edwards25519 suites respectively.
- RFC 8017 — RSASP1/RSAVP1 and MGF1 primitives used by RSA-FDH-VRF; its
  RSASSA encoding methods are not part of the RFC 9381 RSA-FDH-VRF check.

## Informative

- Micali, Rabin, Vadhan — "Verifiable Random Functions" (FOCS 1999): the
  original VRF definitions behind RFC 9381 §3.
- Papadopoulos et al. — "Making NSEC5 Practical for DNSSEC" and the
  Goldberg-Reyzin ECVRF line of papers: design rationale for the RFC's
  ECVRF construction.
- Gilad et al. — "Algorand: Scaling Byzantine Agreements" (SOSP 2017) and
  David et al. — "Ouroboros Praos" (EUROCRYPT 2018): VRF-based leader
  election and the withholding/grinding bias models used in the
  application-level checks (P7).
- Chainlink VRF documentation: a widely-deployed consumer pattern for
  verify-before-use and request/fulfillment binding (P1 calibration).
