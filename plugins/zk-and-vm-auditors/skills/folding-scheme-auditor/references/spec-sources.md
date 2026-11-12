# folding-scheme-auditor Spec Sources

## Normative

- Kothapalli, Setty, Tzialla, "Nova: Recursive Zero-Knowledge Arguments from
  Folding Schemes" (CRYPTO 2022; ePrint 2021/370). Relaxed R1CS, the folding
  scheme and its cross-term, the augmented step circuit, base case, and the
  IVC verifier's checks.
- Nguyen, Boneh, Setty, "Revisiting the Nova Proof System on a Cycle of
  Curves" (ePrint 2023/969). The two-curve IVC construction as actually
  deployed, the soundness vulnerability in the original implementation, and
  the checks that fix it. Governs P8 and the both-sides-of-the-cycle check.
- Kothapalli, Setty, "SuperNova: Proving Universal Machine Executions
  without Universal Circuits" (ePrint 2022/1758). Non-uniform IVC and
  program-counter binding.
- Kothapalli, Setty, "HyperNova: Recursive Arguments for Customizable
  Constraint Systems" (ePrint 2023/573), with Setty, Thaler, Wahby,
  "Customizable Constraint Systems for Succinct Arguments"
  (ePrint 2023/552). CCS, the LCCCS and CCCS instance types, and the
  sum-check-based multi-folding relation.
- Bunz, Chen, "ProtoStar: Generic Efficient Accumulation/Folding for
  Special-sound Protocols" (ePrint 2023/620), and Eagen, Gabizon,
  "ProtoGalaxy: Efficient ProtoStar-style Folding of Multiple Instances"
  (ePrint 2023/1106). Error and cross terms for higher-degree relations.
- Mohnblatt, "Sangria: a Folding Scheme for PLONK" (Geometry Research
  technical note, 2023). Relaxed PLONK gate equation.
- Kothapalli, Setty, "CycleFold: Folding-scheme-based Recursive Arguments
  over a Cycle of Elliptic Curves" (ePrint 2023/1192). Delegating group
  operations to the second curve and binding the delegated circuit's IO.

## Informative

- Valiant, "Incrementally Verifiable Computation or Proofs of Knowledge
  Imply Time/Space Efficiency" (TCC 2008). The IVC definition.
- Bowe, Grigg, Hopwood, "Recursive Proof Composition without a Trusted
  Setup" (ePrint 2019/1021), and Bunz, Chiesa, Lin, Mishra, Spooner,
  "Proof-Carrying Data without Succinct Arguments" (CRYPTO 2021).
  Accumulation and split accumulation, the lineage folding comes from.
- Setty, "Spartan: Efficient and General-Purpose zkSNARKs without Trusted
  Setup" (CRYPTO 2020). The compressing SNARK used as Nova's decider.
- Reference implementations (the Nova repository, Sonobe) and their audit
  reports. Use them to diff absorb order and decider statements; cite a
  specific report when a candidate depends on one.
