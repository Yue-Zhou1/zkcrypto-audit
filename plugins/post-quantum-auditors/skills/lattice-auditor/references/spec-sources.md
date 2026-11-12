# lattice-auditor Spec Sources

## Normative

- The target's defining paper or specification: normative for parameters,
  distributions, rounding, and the failure bound. Conformance diffing goes
  to `spec-delta-checker`.
- Regev, "On Lattices, Learning with Errors, Random Linear Codes, and
  Cryptography" (STOC 2005): LWE.
- Lyubashevsky, Peikert, Regev, "On Ideal Lattices and Learning with
  Errors over Rings" (EUROCRYPT 2010): RLWE.
- Langlois, Stehle, "Worst-Case to Average-Case Reductions for Module
  Lattices" (Designs, Codes and Cryptography 2015): MLWE.
- Ajtai, "Generating Hard Instances of Lattice Problems" (STOC 1996): SIS.
- Hoffstein, Pipher, Silverman, "NTRU: A Ring-Based Public Key
  Cryptosystem" (ANTS 1998).
- Hofheinz, Hovelmanns, Kiltz, "A Modular Analysis of the Fujisaki-Okamoto
  Transformation" (TCC 2017): correctness error in chosen-ciphertext
  security.
- Lyubashevsky, "Fiat-Shamir with Aborts" (ASIACRYPT 2009) and "Lattice
  Signatures without Trapdoors" (EUROCRYPT 2012): what rejection sampling
  must achieve.

## Informative

- Albrecht, Player, Scott, "On the Concrete Hardness of Learning with
  Errors" (2015) and the lattice estimator: reproducing estimates.
- Alkim, Ducas, Poppelmann, Schwabe, "Post-Quantum Key Exchange: A New
  Hope" (USENIX Security 2016): core-SVP costing, centred binomial noise.
- Howgrave-Graham, hybrid lattice-reduction and meet-in-the-middle attack
  (CRYPTO 2007); Arora, Ge, "New Algorithms for Learning in Presence of
  Errors" (ICALP 2011): P6.
- Albrecht, Bai, Ducas, "A Subfield Lattice Attack on Overstretched NTRU
  Assumptions" (CRYPTO 2016).
- Fluhrer, "Cryptanalysis of Ring-LWE Based Key Exchange with Key Share
  Reuse" (ePrint 2016/085): P9.
- D'Anvers et al., "Decryption Failure Attacks on IND-CCA Secure
  Lattice-Based Schemes" (PKC 2019): P2.
- Nguyen, Regev, "Learning a Parallelepiped" (EUROCRYPT 2006); Gentry,
  Peikert, Vaikuntanathan, trapdoor preimage sampling (STOC 2008): P12.
- Groot Bruinderink et al., "Flush, Gauss, and Reload" (CHES 2016);
  Espitau et al., "Side-Channel Attacks on BLISS Lattice-Based Signatures"
  (CCS 2017): sampler and rejection leakage (P1, P7).
- Baum et al., "More Efficient Commitments from Structured Lattice
  Assumptions" (SCN 2018): norm-bounded openings (P11).
