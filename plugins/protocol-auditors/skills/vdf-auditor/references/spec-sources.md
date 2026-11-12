# vdf-auditor Spec Sources

There is no RFC or standard for VDFs. The normative source for a target is
the construction paper it implements plus the deployment's own protocol
specification (consensus rules, parameter files, ceremony transcript).

## Normative

- Boneh, Bonneau, Bünz, Fisch — "Verifiable Delay Functions" (CRYPTO 2018):
  definitions of sequentiality, soundness, and uniqueness that every claim
  in this skill is measured against.
- Wesolowski — "Efficient Verifiable Delay Functions" (EUROCRYPT 2019):
  the single-element proof, the challenge prime and its sampling set, the
  verification equation, and the class-group instantiation.
- Pietrzak — "Simple Verifiable Delay Functions" (ITCS 2019): the halving
  protocol, per-round challenges, the final check, and the requirement to
  work in the signed quadratic residues of a safe-prime modulus.
- Boneh, Bünz, Fisch — "A Survey of Two Verifiable Delay Functions"
  (ePrint 2018/712): side-by-side statement of both verifiers, the
  low-order and adaptive-root assumptions, and why low-order elements
  break soundness (P6).
- The target's own specification: which group, how the modulus or
  discriminant is produced, how T is set, and how the output is consumed.
  Where it disagrees with the papers, the disagreement is a candidate.

## Informative

- Rivest, Shamir, Wagner — "Time-lock Puzzles and Timed-release Crypto"
  (1996): repeated squaring in an RSA group and the trapdoor shortcut that
  motivates the modulus-provenance checks (P3).
- Boneh, Bünz, Fisch — "Batching Techniques for Accumulators with
  Applications to IOPs and Stateless Blockchains" (CRYPTO 2019): proofs of
  exponentiation generalising the Wesolowski check, and hash-to-prime as
  part of the transcript.
- Lenstra, Wesolowski — "A random zoo: sloth, unicorn, and trx" (2015):
  delay-based randomness beacons and the bias-window reasoning used in the
  consumer checks (P11).
- Dobson, Galbraith, Smith — "Trustless unknown-order groups" (ePrint
  2020/196): parameter sizing for class groups and other setup-free groups.
- Chia Documentation — "Proof of Time (VDFs)" (Consensus section), and the
  Chia-Network/chiavdf implementation: a deployed class-group Wesolowski
  VDF with a per-challenge discriminant and proofs split into n segments
  ("n-wesolowski"); useful for calibrating P4 and P10.
- Drake — "Minimal VDF randomness beacon" (ethresear.ch, 2018): a worked
  consumer design combining RANDAO with a VDF, including the maximum
  attacker advantage parameter A_max.
