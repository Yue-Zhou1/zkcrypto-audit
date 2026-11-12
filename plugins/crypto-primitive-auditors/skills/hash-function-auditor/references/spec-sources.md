# hash-function-auditor Spec Sources

## Normative

- Grassi, Khovratovich, Rechberger, Roy, Schofnegger — "Poseidon: A New
  Hash Function for Zero-Knowledge Proof Systems" (USENIX Security 2021,
  ePrint 2019/458), with the designers' reference scripts for round
  numbers and Grain-LFSR constant generation: instance definition, round
  formulas, sponge and domain-separation rules.
- Grassi, Khovratovich, Schofnegger — "Poseidon2: A Faster Version of the
  Poseidon Hash Function" (AFRICACRYPT 2023): external and internal
  linear layers, initial linear layer, compression mode.
- Aly, Ashur, Ben-Sasson, Dhooghe, Szepieniec — "Design of Symmetric-Key
  Primitives for Advanced Cryptographic Protocols" (ToSC 2020), and
  Szepieniec, Ashur, Dhooghe — "Rescue-Prime: a Standard Specification
  (SoK)": Rescue round structure, exponents, round numbers.
- Albrecht, Grassi, Rechberger, Roy, Tiessen — "MiMC: Efficient Encryption
  and Cryptographic Hashing with Minimal Multiplicative Complexity"
  (ASIACRYPT 2016): round counts and hashing modes.
- Bertoni, Daemen, Peeters, Van Assche — "Cryptographic Sponge Functions":
  the sponge construction and the capacity bound behind the checklist's
  capacity and digest-length items.
- Zcash Protocol Specification, Pedersen hash definition: generator
  derivation and the bounded, injective input encoding.
- The target's own specification of its hash instances and domain tags.

## Informative

- Bouvier et al. — "New Design Techniques for Efficient
  Arithmetization-Oriented Hash Functions: Anemoi Permutations and Jive
  Compression Mode" (CRYPTO 2023), and Grassi et al. — "Horst Meets
  Fluid-SPN: Griffin for Zero-Knowledge Applications" (CRYPTO 2023).
- Bariant, Bouvier, Leurent, Perrin — "Algebraic Attacks against Some
  Arithmetization-Oriented Primitives" (ToSC 2022): attacks that cut into
  round margins.
- Beyne et al. — "Out of Oddity" (CRYPTO 2020); Keller, Rosemarin — "Mind
  the Middle Layer: The HADES Design Strategy Revisited" (EUROCRYPT 2021);
  Grassi, Rechberger, Schofnegger — "Proving Resistance Against Infinitely
  Long Subspace Trails" (ToSC 2021): weak linear layers (P4).
- Bariant et al. — "The Algebraic FreeLunch" (CRYPTO 2024): Groebner-basis
  attacks on Griffin, Arion, and Anemoi; reason to check newer designs'
  parameters against current analysis.
- Aumasson, Khovratovich, Mennink, Quine — "SAFE: Sponge API for Field
  Elements": IV-encoded call patterns for domain separation.
