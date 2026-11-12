# gnark-auditor Spec Sources

## Normative

- gnark package documentation for the pinned version (`frontend`,
  `backend/groth16`, `backend/plonk`, and the `std` packages). The doc
  comments on `frontend.API` methods and std gadgets are where preconditions
  and unconstrained cases are stated; they govern the API-precondition and
  gadget checks. Read the pinned version, behavior has changed across
  releases.
- gnark security advisories (Consensys/gnark repository). CVE-2023-44378,
  non-unique binary decomposition and variable comparison, fixed in v0.9.0,
  governs P4. The 2024 advisories on the Groth16 commitment extension
  (soundness with more than one commitment, and loss of zero-knowledge for
  committed private witnesses), fixed in v0.11.0, govern the backend checks.
- Groth, "On the Size of Pairing-based Non-interactive Arguments"
  (EUROCRYPT 2016). Groth16 statement, setup structure, and why proofs are
  re-randomizable.
- Gabizon, Williamson, Ciobotaru, "PLONK: Permutations over Lagrange-bases
  for Oecumenical Noninteractive arguments of Knowledge" (ePrint 2019/953).
  The PLONK backend's statement and universal-SRS model.
- Bowe, Gabizon, Miers, "Scalable Multi-party Computation for zk-SNARK
  Parameters in the Random Beacon Model" (ePrint 2017/1050). The two-phase
  Groth16 ceremony model against which setup provenance is judged.
- The target protocol's own specification of the statement: which values are
  public, their encoding, and their order. This is the reference for every
  visibility and public-witness check.

## Informative

- Baghery, Kohlweiss, Siim, Volkhov, "Another Look at Extraction and
  Randomization of Groth's zk-SNARK" (FC 2021). What Groth16 malleability
  does and does not allow; calibrates the proof-as-identifier check.
- Belling, Soleimanian, Begassat, "Recursion over Public-Coin Interactive
  Proof Systems; Faster Hash Verification" (ePrint 2022/1072). Background for
  the commitment extension used by gnark's Groth16 backend.
- Haboeck, "Multivariate lookups based on logarithmic derivatives"
  (ePrint 2022/1530). Background for the log-derivative lookup and
  range-check gadgets.
- Kate, Zaverucha, Goldberg, "Constant-Size Commitments to Polynomials and
  Their Applications" (ASIACRYPT 2010). KZG, the commitment behind the PLONK
  SRS; depth belongs to `commitment-scheme-auditor`.
- zksecurity/zkbugs corpus, gnark entries, reached through `zkbugs-index`.
  Prior art for P4 (the CVE-2023-44378 entry).
