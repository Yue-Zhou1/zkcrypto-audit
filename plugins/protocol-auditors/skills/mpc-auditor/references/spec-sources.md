# mpc-auditor Spec Sources

General MPC has no standards body. The normative source for a target is the
paper its code or documentation claims to implement.

## Normative

- Lindell, Pinkas — "A Proof of Security of Yao's Protocol for Two-Party
  Computation" (Journal of Cryptology, 2009): the semi-honest baseline that
  garbling claims are measured against.
- Kolesnikov, Schneider — "Improved Garbled Circuit: Free XOR Gates and
  Applications" (ICALP 2008), and Zahur, Rosulek, Evans — "Two Halves Make a
  Whole" (EUROCRYPT 2015): free-XOR and half-gates, the global offset, and
  per-gate tweaks.
- Choi, Katz, Kumaresan, Zhou — "On the Security of the 'Free-XOR'
  Technique" (TCC 2012): the circular correlation robustness assumption the
  gate hash must satisfy.
- Ishai, Kilian, Nissim, Petrank — "Extending Oblivious Transfers
  Efficiently" (CRYPTO 2003), and Keller, Orsini, Scholl — "Actively Secure
  OT Extension with Optimal Overhead" (CRYPTO 2015): OT extension and the
  consistency check a malicious-secure variant needs. The CRYPTO 2015
  proof rests on a lemma shown incorrect by Roy — "SoftSpokenOT" (CRYPTO
  2022), which gives a check with a complete proof; the authors' 2022
  revision (ePrint 2015/546) repairs the protocol. A target citing the
  2015 check is measured against one of these.
- Damgård, Pastro, Smart, Zakarias — "Multiparty Computation from Somewhat
  Homomorphic Encryption" (CRYPTO 2012), and Damgård et al. — "Practical
  Covertly Secure MPC for Dishonest Majority - or: Breaking the SPDZ Limits"
  (ESORICS 2013): SPDZ shares, the global MAC key, the batched MAC check,
  and triple sacrifice.
- Keller, Orsini, Scholl — "MASCOT" (CCS 2016): OT-based triples.
- Beaver — "Efficient Multiparty Protocols Using Circuit Randomization"
  (CRYPTO 1991): multiplication triples, each consumed once.

## Informative

- Lindell, Pinkas — "An Efficient Protocol for Secure Two-Party Computation
  in the Presence of Malicious Adversaries" (EUROCRYPT 2007): cut-and-choose,
  garbler input consistency, and the selective-failure problem (P6), first
  observed by Kiraz and Schoenmakers (2006).
- Wang, Ranellucci, Katz — "Authenticated Garbling and Efficient Maliciously
  Secure Two-Party Computation" (CCS 2017): garbler correctness without
  cut-and-choose.
- Guo, Katz, Wang, Yu — "Efficient and Secure Multiparty Computation from
  Fixed-Key Block Ciphers" (IEEE S&P 2020): which fixed-key AES hash
  constructions are sound for OT extension and garbling.
- Cleve — "Limits on the Security of Coin Flips when Half the Processors Are
  Faulty" (STOC 1986): why fairness is unavailable without honest majority.
- Evans, Kolesnikov, Rosulek — "A Pragmatic Introduction to Secure
  Multi-Party Computation" (2018): adversary models and protocol families.
