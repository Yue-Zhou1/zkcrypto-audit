# fault-injection-auditor Spec Sources

## Primary papers (normative for the attack classes)

- Boneh, DeMillo, Lipton — "On the Importance of Checking Cryptographic
  Protocols for Faults" (EUROCRYPT 1997). The Bellcore attack: the
  foundational RSA-CRT fault factorization and the general fault-attack
  framework this skill audits against (F1).
- Biham, Shamir — "Differential Fault Analysis of Secret Key
  Cryptosystems" (CRYPTO 1997). The DFA methodology generalized to
  symmetric and, by extension, deterministic signature schemes (F2).
- Poddebniak, Somorovsky, Schinzel, Lochter, Rösler — "Attacking
  Deterministic Signature Schemes using Fault Attacks" (EuroS&P 2018).
  Concrete DFA against deterministic ECDSA/EdDSA — the direct basis for
  the deterministic-signature checks (F2).
- Aumüller, Bier, Fischer, Hofreiter, Seifert — "Fault Attacks on RSA with
  CRT: Concrete Results and Practical Countermeasures" (CHES 2002).
  Verify-after-sign and redundancy countermeasures and how they fail
  (F1, F5).

## Countermeasure references

- Shamir's and Giraud's RSA-CRT fault countermeasures (as surveyed in the
  CHES/FDTC literature): the redundancy/consistency-check designs and their
  double-fault limits.
- Yen, Joye — "Checking before output may not be enough against
  fault-based cryptanalysis" (IEEE TC 2000): why a naive output check is
  insufficient (F5).

## Informative

- FDTC (Fault Diagnosis and Tolerance in Cryptography) workshop
  proceedings: the standing venue for instruction-skip, laser, and glitch
  fault models used to scope the attacker model.
- Common Criteria / JIL "Application of Attack Potential to Smartcards":
  the deployment-context framing for whether a fault model is credible.
