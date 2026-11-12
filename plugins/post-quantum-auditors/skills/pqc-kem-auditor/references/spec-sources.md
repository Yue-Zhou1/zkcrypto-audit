# pqc-kem-auditor Spec Sources

## Normative

- FIPS 203 — "Module-Lattice-Based Key-Encapsulation Mechanism Standard"
  (final, August 2024). The governing standard for everything in this
  skill: ML-KEM.KeyGen/Encaps/Decaps (§7) and their internal algorithms
  (§6), input checking requirements (§7.2, §7.3), implicit rejection via
  J(z || c) (§6.3), ByteEncode/Compress rounding (§4.2.1), and parameter
  sets (§8). Pin reviews to the FINAL version — it differs from round-3
  Kyber in the shared-secret derivation and input checks, and from the
  initial public draft in K-PKE.KeyGen domain separation and the matrix
  index order (Appendix C).
- NIST SP 800-227 (final) — "Recommendations for Key-Encapsulation
  Mechanisms": KEM usage, key-combiner, and shared-secret handling
  guidance for the downstream checks.

## Informative

- CRYSTALS-Kyber round-3 submission (Avanzi et al., NIST PQC round 3):
  the pre-standard construction; needed to recognize round-3/FIPS mixing
  (P4) in codebases written before August 2024.
- Fujisaki, Okamoto — "Secure Integration of Asymmetric and Symmetric
  Encryption Schemes" (CRYPTO 1999) and Hofheinz, Hövelmanns, Kiltz —
  "A Modular Analysis of the Fujisaki-Okamoto Transformation" (TCC 2017):
  why implicit rejection and re-encryption must be exact (P1).
- "KyberSlash" disclosures (reported December 2023; Bernstein et al.,
  "KyberSlash: Exploiting secret-dependent division timings in Kyber
  implementations", TCHES 2025): the P2 secret-dependent-timing class.
  Kyber reference-derived code divided secret numerators by the public
  modulus q in message decoding (KyberSlash1, decryption) and in
  ciphertext compression (KyberSlash2, re-encryption).
- ACVP ML-KEM test vectors (NIST): the KAT source implementations must
  match (versioned to FIPS 203 final).
