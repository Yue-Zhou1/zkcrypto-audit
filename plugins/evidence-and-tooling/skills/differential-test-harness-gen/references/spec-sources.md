# differential-test-harness-gen Spec Sources

This skill generates evidence rather than asserting spec claims; its
"sources" are the authoritative test-vector corpora and the standards the
vectors encode.

## Test-vector corpora (authoritative)

- Project Wycheproof (C2SP/wycheproof, originally Google) — the primary
  corpus. Encodes known edge cases and historical CVEs for ECDSA, EdDSA,
  DSA, RSA (PSS/PKCS1), AES-GCM/EAX, DH/ECDH, HKDF, ML-KEM, and more,
  each case labeled valid/invalid/acceptable. The highest-value source
  for D1-class divergences.
- NIST CAVP / ACVP — Cryptographic Algorithm Validation Program vectors
  for FIPS primitives (AES, SHA-2/3, ECDSA, ML-KEM/FIPS 203,
  ML-DSA/FIPS 204, SLH-DSA/FIPS 205). Authoritative for standardized
  algorithms.
- RFC test vectors — e.g., RFC 8032 (EdDSA), RFC 6979 (deterministic
  ECDSA), RFC 8439 (ChaCha20-Poly1305), RFC 9381 (VRF). Authoritative for
  RFC-defined schemes.

## Methodology references (informative)

- McKeeman, "Differential Testing for Software" (Digital Technical
  Journal, 1998): the differential-testing method this skill applies.
- Wycheproof project documentation: guidance on interpreting the
  valid/invalid/acceptable labels and mapping them to verdicts.
- The consuming skill `crypto-fp-check` adjudicates whether a captured
  divergence is a true finding.
