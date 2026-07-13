# signature-scheme-auditor Spec Sources

## Normative

- FIPS 186-5 — "Digital Signature Standard (DSS)" (February 2023).
  Normative for ECDSA: per-message secret requirements, hash truncation
  (§6.4.1), and approved curves; also incorporates EdDSA by reference.
- SEC 1 v2.0 — "Elliptic Curve Cryptography" (Certicom, 2009). Normative
  for ECDSA verification steps and §3.2.2 full public-key validation.
- BIP-340 — "Schnorr Signatures for secp256k1" (Wuille, Nick, Ruffing).
  Normative for x-only keys, lift_x, tagged hashes, the verification
  equation's even-Y requirement, and batch-verification weighting.
- RFC 8032 — "Edwards-Curve Digital Signature Algorithm (EdDSA)".
  Normative for Ed25519/Ed448 encode/decode rules (s < L, canonical
  points), the (co)factored verification equations, and the ph/ctx
  variants.
- RFC 8017 — "PKCS #1: RSA Cryptography Specifications Version 2.2".
  Normative for RSASSA-PSS (EMSA-PSS encoding/verification, salt, 0xBC
  trailer, MGF1) and RSASSA-PKCS1-v1_5 (EMSA-PKCS1-v1_5 exact-encoding
  comparison).
- RFC 6979 — "Deterministic Usage of DSA and ECDSA". Normative for
  deterministic nonce derivation referenced from signing paths (lifecycle
  review handed to randomness-auditor).

## Informative

- Chalkias, Garillot, Nikolaenko — "Taming the Many EdDSAs" (SSR 2020):
  the divergent Ed25519 validation-criteria taxonomy behind the
  batch/single and canonicality checks (P2/P3).
- CVE-2022-21449 ("psychic signatures", Java ECDSA): canonical P1 instance.
- Bleichenbacher's 2006 CRYPTO rump-session e=3 forgery and its recurrences
  (BERserk, CVE-2014-1568): canonical P5 instances.
- Poddebniak et al., "Attacking Deterministic Signature Schemes using Fault
  Attacks" (EuroS&P 2018): motivates P10 verify-after-sign.
- BIP-62 / SegWit design history: signature malleability as txid-identity
  breakage (P9).
