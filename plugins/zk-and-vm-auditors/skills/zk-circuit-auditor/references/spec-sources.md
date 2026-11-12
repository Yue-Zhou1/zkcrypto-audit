# zk-circuit-auditor Spec Sources

Authoritative sources for the checklist and pattern files. Library-specific
pattern files cite their upstream documentation inline; this file pins the
protocol-level sources.

## Normative

- Groth16 — Groth, "On the Size of Pairing-based Non-interactive
  Arguments", EUROCRYPT 2016 (ePrint 2016/260): verification equation and
  public-input handling.
- PLONK — Gabizon, Williamson, Ciobotaru, "PLONK: Permutations over
  Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge"
  (ePrint 2019/953): PLONKish gate and permutation argument structure
  and transcript ordering. Lookup arguments are later additions: Gabizon,
  Williamson, "plookup: A simplified polynomial protocol for lookup tables"
  (ePrint 2020/315).
- KZG — Kate, Zaverucha, Goldberg, "Constant-Size Commitments to
  Polynomials and Their Applications", ASIACRYPT 2010: commitment and
  opening-proof semantics behind PCS-based verifiers.
- ethSTARK — StarkWare Team, "ethSTARK Documentation" (ePrint 2021/582):
  concrete STARK protocol composition — AIR, composition polynomial,
  FRI parameterization, grinding, and the soundness-budget accounting used
  in the STARK/AIR review workflow.
- FRI — Ben-Sasson, Bentov, Horesh, Riabzev, "Fast Reed-Solomon
  Interactive Oracle Proofs of Proximity" (ICALP 2018): low-degree testing
  semantics, query/blowup trade-offs.
- DEEP-FRI — Ben-Sasson, Goldberg, Kopparty, Saraf, "DEEP-FRI: Sampling
  Outside the Box Improves Soundness" (ITCS 2020): out-of-domain sampling
  and the DEEP composition consistency requirements.
- BCS transform — Ben-Sasson, Chiesa, Spooner, "Interactive Oracle Proofs"
  (TCC 2016-B): the IOP-to-NIZK compilation whose transcript-ordering
  requirements the Fiat-Shamir checks enforce.

## Informative

- STARK — Ben-Sasson, Bentov, Horesh, Riabzev, "Scalable, transparent,
  and post-quantum secure computational integrity" (ePrint 2018/046):
  original STARK construction context.
- Winterfell (meta/winterfell, formerly facebook/winterfell) and Plonky3
  documentation: reference
  implementations for generic AIR/STARK verifier structure outside
  Cairo/Starknet.
- zksecurity/zkbugs corpus: real-world instances of unconstrained-signal
  and transcript-ordering bugs referenced by the finding patterns.
