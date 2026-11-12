# fiat-shamir-auditor Spec Sources

## Normative

- The target protocol's own paper or specification. It fixes the message
  order and which messages each challenge must follow (for example the
  PLONK paper's challenge list or the ethSTARK documentation). Pin it
  before review; a transcript cannot be judged complete without it.
- RFC 8235 — "Schnorr Non-interactive Zero-Knowledge Proof". Requires the
  challenge hash to cover the generator, the commitment, the public key,
  and prover identity/context. Normative where claimed; otherwise the
  reference shape for sigma-protocol statement binding.
- RFC 9380 — "Hashing to Elliptic Curves", hash_to_field. The
  extra-bits reduction rule for deriving near-uniform field elements from
  hash output; governs the field-reduction checks.
- Ben-Sasson, Chiesa, Spooner — "Interactive Oracle Proofs" (TCC 2016-B).
  The BCS transform and state-restoration soundness; governs transcripts of
  IOP-based (STARK/FRI) systems.

## Informative

- Fiat, Shamir — "How to Prove Yourself: Practical Solutions to
  Identification and Signature Problems" (CRYPTO 1986): the transform.
- Bernhard, Pereira, Warinschi — "How Not to Prove Yourself: Pitfalls of
  the Fiat-Shamir Heuristic and Applications to Helios" (ASIACRYPT 2012):
  weak vs strong Fiat-Shamir (P3).
- Trail of Bits — "Frozen Heart" coordinated disclosure series (2022) on
  Girault, Bulletproofs, and PlonK implementations (P1, P3).
- Dao, Miller, Wright, Grubbs — "Weak Fiat-Shamir Attacks on Modern Proof
  Systems" (IEEE S&P 2023): survey and attacks across implementations.
- Canetti et al. — "Fiat-Shamir: From Practice to Theory" (STOC 2019), and
  Attema, Fehr, Klooß — "Fiat-Shamir Transformation of Multi-Round
  Interactive Proofs" (TCC 2022): round-by-round soundness and the
  security loss of multi-round transforms.
- Ciobotaru, Peter, Velichkov — "The Last Challenge Attack on Fiat-Shamir
  in KZG-based SNARKs" (ePrint 2024/398): a batching challenge not bound
  to the opening proofs in a KZG-based PLONK verifier (P10).
- Khovratovich, Rothblum, Soukhanov — "How to Prove False Statements:
  Practical Attacks on Fiat-Shamir" (2025): an attack on a GKR-based
  argument when the proven circuit can evaluate the transcript hash.
  Record such compositions as `residual_risk`.
- Merlin transcript documentation (STROBE-based): labelled, length-framed
  absorbs; reference design for P4 and P7.
- Aumasson, Khovratovich, Mennink, Quine — "SAFE: Sponge API for Field
  Elements": absorb/squeeze call-pattern binding for sponge transcripts.
