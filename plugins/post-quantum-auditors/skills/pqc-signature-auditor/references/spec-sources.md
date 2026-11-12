# pqc-signature-auditor Spec Sources

## Normative

- FIPS 204 — "Module-Lattice-Based Digital Signature Standard" (final,
  August 2024). Governs ML-DSA: rejection sampling bounds (§6.2,
  Algorithm 7; loop limits in Appendix C), hedged vs deterministic
  signing (§3.4), the ctx parameter and HashML-DSA prehash variants (§5),
  and verification bound enforcement (§6.3, Algorithm 8).
- FIPS 205 — "Stateless Hash-Based Digital Signature Standard" (final,
  August 2024). Governs SLH-DSA: ADRS addressing, WOTS+ chains and
  checksums, FORS, opt_rand, and parameter sets.
- NIST SP 800-208 — "Recommendation for Stateful Hash-Based Signature
  Schemes" (October 2020). Governs XMSS/XMSS^MT (RFC 8391) and LMS/HSS
  (RFC 8554) deployment: one-time key state management (leaf index
  incremented and stored in nonvolatile storage before a signature is
  exported, §8.1), the ban on exporting private keying material,
  distributed multi-tree key generation (§7), and the hardware
  cryptographic-module requirements (§8.1).
- RFC 8391 (XMSS) and RFC 8554 (LMS/HSS) — the underlying scheme
  definitions SP 800-208 profiles.

## FN-DSA / Falcon standardization status (pinned)

- FN-DSA is slated for FIPS 206, which is NOT final as of 2026-11 (NIST's
  PQC standardization page lists it as "in development"). Reviews of
  Falcon deployments audit against the Falcon round-3 specification
  ("Falcon: Fast-Fourier Lattice-based Compact Signatures
  over NTRU", NIST PQC round-3 submission) and MUST record that the final
  FIPS 206 may diverge. Treat conformance claims to "FIPS 206" as
  unverifiable until publication.

## Informative

- CRYSTALS-Dilithium and SPHINCS+ round-3 submissions: pre-standard
  variants needed to recognize round-3/final mixing (P8).
- Fouque, Kirchner, Tibouchi, Wallet, Yu — "Key Recovery from
  Gram-Schmidt Norm Leakage in Hash-and-Sign Signatures over NTRU
  Lattices" (EUROCRYPT 2020): Gaussian-sampler timing leakage, with the
  attack demonstrated against the DLP scheme and left open for Falcon;
  Karabulut, Aysu — "Falcon Down: Breaking Falcon Post-Quantum Signature
  Scheme through Side-Channel Attacks" (DAC 2021): electromagnetic
  attack on Falcon's floating-point multiplications; Lin, Tibouchi, Yu,
  Zhang — "Do Not Disturb a Sleeping Falcon: Floating-Point Error
  Sensitivity of the Falcon Sampler and Its Consequences" (EUROCRYPT
  2025) (P7 calibration).
- Castelnovi, Martinelli, Prest — "Grafting Trees: A Fault Attack Against
  the SPHINCS Framework" (PQCrypto 2018) and Genêt — "On Protecting
  SPHINCS+ Against Fault Attacks" (TCHES 2023) for SLH-DSA; Groot
  Bruinderink, Pessl — "Differential Fault Attacks on Deterministic
  Lattice Signatures" (TCHES 2018) for Dilithium/ML-DSA; Poddebniak et
  al. —
  "Attacking Deterministic Signature Schemes using Fault Attacks"
  (EuroS&P 2018) for deterministic ECDSA and EdDSA (P4).
- McGrew, Kampanakis et al. — "State Management for Hash-Based
  Signatures" (SSR 2016): the operational failure modes behind the
  SP 800-208 state rules (P1/P9).
