# pqc-signature-auditor Spec Sources

## Normative

- FIPS 204 — "Module-Lattice-Based Digital Signature Standard" (final,
  August 2024). Governs ML-DSA: rejection sampling bounds (§6), hedged vs
  deterministic signing, the ctx parameter, HashML-DSA prehash variants,
  and verification bound enforcement.
- FIPS 205 — "Stateless Hash-Based Digital Signature Standard" (final,
  August 2024). Governs SLH-DSA: ADRS addressing, WOTS+ chains and
  checksums, FORS, opt_rand, and parameter sets.
- NIST SP 800-208 — "Recommendation for Stateful Hash-Based Signature
  Schemes" (October 2020). Governs XMSS/XMSS^MT (RFC 8391) and LMS/HSS
  (RFC 8554) deployment: one-time key state management, index
  monotonicity, backup/restore restrictions, distributed multi-tree key
  generation, and the hardware cryptographic-module requirements.
- RFC 8391 (XMSS) and RFC 8554 (LMS/HSS) — the underlying scheme
  definitions SP 800-208 profiles.

## FN-DSA / Falcon standardization status (pinned)

- FN-DSA is slated for FIPS 206, which is NOT final as of 2026-07 (draft
  stage). Reviews of Falcon deployments audit against the Falcon round-3
  specification ("Falcon: Fast-Fourier Lattice-based Compact Signatures
  over NTRU", NIST PQC round-3 submission) and MUST record that the final
  FIPS 206 may diverge. Treat conformance claims to "FIPS 206" as
  unverifiable until publication.

## Informative

- CRYSTALS-Dilithium and SPHINCS+ round-3 submissions: pre-standard
  variants needed to recognize round-3/final mixing (P8).
- Fouque, Kirchner, Tibouchi et al. — Falcon floating-point timing
  key-recovery line of work (P7 calibration).
- Castelnovi, Martinelli, Prest — "Grafting Trees: A Fault Attack Against
  the SPHINCS Framework" and Poddebniak et al. (EuroS&P 2018) on
  deterministic-signature fault attacks (P4).
- McGrew, Kampanakis et al. — "State Management for Hash-Based
  Signatures" (SSR 2016): the operational failure modes behind the
  SP 800-208 state rules (P1/P9).
