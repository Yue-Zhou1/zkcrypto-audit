# pqc-kem-auditor Spec Sources

## Normative

- FIPS 203 — "Module-Lattice-Based Key-Encapsulation Mechanism Standard"
  (final, August 2024). The governing standard for everything in this
  skill: ML-KEM.KeyGen/Encaps/Decaps (§7), input checking requirements,
  implicit rejection via J(z || c), ByteEncode/Compress rounding (§4.2.1),
  and parameter sets (§8). Pin reviews to the FINAL version — it differs
  from the initial public draft and from round-3 Kyber in the shared-secret
  derivation.
- NIST SP 800-227 (draft) — "Recommendations for Key-Encapsulation
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
- "KyberSlash" disclosures (2024, division-timing leaks in Kyber
  reference-derived code): the P2 constant-time reject-path class.
- ACVP ML-KEM test vectors (NIST): the KAT source implementations must
  match (versioned to FIPS 203 final).
