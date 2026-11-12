# dkg-threshold-auditor Spec Sources

## Normative

- RFC 9591 — "The Flexible Round-Optimized Schnorr Threshold (FROST)
  Protocol for Two-Round Schnorr Signatures" (June 2024). Normative for
  FROST signing: nonce commitments (§5.1), binding factors (§4.4), signature
  shares (§5.2), aggregation (§5.3), identifier and interpolation rules,
  and ciphersuite hash domains. Its key generation is trusted-dealer only
  (Appendix C); a DKG is governed by its own document.
- BIP-327 — "MuSig2 for BIP340-compatible Multi-Signatures", with Nick,
  Ruffing, Seurin — "MuSig2: Simple Two-Round Schnorr Multi-Signatures"
  (CRYPTO 2021) as its rationale. Normative for key aggregation
  coefficients, the two-nonce scheme, and secret-nonce handling.
- Feldman — "A Practical Scheme for Non-interactive Verifiable Secret
  Sharing" (FOCS 1987), and Pedersen — "Non-Interactive and
  Information-Theoretic Secure Verifiable Secret Sharing" (CRYPTO 1991):
  the share-verification equations and the generator requirement.
- Gennaro, Jarecki, Krawczyk, Rabin — "Secure Distributed Key Generation
  for Discrete-Log Based Cryptosystems" (EUROCRYPT 1999): the bias attack
  on Pedersen-style DKG, complaint and disqualification rounds, and the
  qualified set (P8, P9).
- Komlo, Goldberg — "FROST: Flexible Round-Optimized Schnorr Threshold
  Signatures" (SAC 2020): the FROST DKG with proofs of knowledge of each
  constant term, which RFC 9591 does not carry.
- IRTF CFRG draft "BLS Signatures" (draft-irtf-cfrg-bls-signature): the
  proof-of-possession scheme and its separate domain tag.

## Informative

- Drijvers et al. — "On the Security of Two-Round Multi-Signatures" (IEEE
  S&P 2019), and Benhamouda, Lepoint, Loss, Orrù, Raykova — "On the
  (in)security of ROS" (EUROCRYPT 2021): concurrent-session forgeries (P5).
- Ristenpart, Yilek — "The Power of Proofs-of-Possession" (EUROCRYPT 2007):
  rogue-key attacks and what a proof of possession must bind (P4).
- Boldyreva — "Threshold Signatures, Multisignatures and Blind Signatures
  Based on the Gap-Diffie-Hellman-Group Signature Scheme" (PKC 2003):
  threshold BLS share verification and combination.
- Herzberg, Jarecki, Krawczyk, Yung — "Proactive Secret Sharing Or: How to
  Cope With Perpetual Leakage" (CRYPTO 1995): share refresh (P10).
- Trail of Bits — "Disclosing Shamir's Secret Sharing vulnerabilities and
  announcing ZKDocs" (2021) and "Breaking the shared key in threshold
  signature schemes" (2024): zero or aliased identifiers and unchecked
  commitment-vector length in deployed libraries (P6, P7).
