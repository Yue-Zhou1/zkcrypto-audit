# fault-injection-auditor Spec Sources

## Primary papers (normative for the attack classes)

- Boneh, DeMillo, Lipton — "On the Importance of Checking Cryptographic
  Protocols for Faults" (EUROCRYPT 1997). The Bellcore attack: the
  foundational RSA-CRT fault factorization and the general fault-attack
  framework this skill audits against (F1). The single-faulty-signature
  form gcd(s'^e - m, N) on a known message is Lenstra's refinement; see
  Joye, Lenstra, Quisquater — "Chinese Remaindering Based Cryptosystems in
  the Presence of Faults" (Journal of Cryptology, 1999).
- Biham, Shamir — "Differential Fault Analysis of Secret Key
  Cryptosystems" (CRYPTO 1997). DFA on secret-key ciphers such as DES: the
  correct-versus-faulty output comparison that F2 applies to deterministic
  signature schemes.
- Poddebniak, Somorovsky, Schinzel, Lochter, Rösler — "Attacking
  Deterministic Signature Schemes using Fault Attacks" (EuroS&P 2018).
  Concrete DFA against deterministic ECDSA/EdDSA — the direct basis for
  the deterministic-signature checks (F2).
- Aumüller, Bier, Fischer, Hofreiter, Seifert — "Fault Attacks on RSA with
  CRT: Concrete Results and Practical Countermeasures" (CHES 2002).
  Fault attacks carried out on smartcard RSA-CRT, an established software
  countermeasure that detected almost none of the induced faults, and
  replacement software countermeasures (F1, F5).

## Countermeasure references

- Shamir's and Giraud's RSA-CRT fault countermeasures (as surveyed in the
  CHES/FDTC literature): the redundancy/consistency-check designs and their
  double-fault limits.
- Yen, Joye — "Checking before output may not be enough against
  fault-based cryptanalysis" (IEEE TC 2000): why a naive output check is
  insufficient — the device's response to a fault can itself reveal key
  bits (F5, F7).

## Informative

- FDTC (Fault Diagnosis and Tolerance in Cryptography) workshop
  proceedings: the standing venue for instruction-skip, laser, and glitch
  fault models used to scope the attacker model.
- Common Criteria / JIL "Application of Attack Potential to Smartcards":
  the deployment-context framing for whether a fault model is credible.
