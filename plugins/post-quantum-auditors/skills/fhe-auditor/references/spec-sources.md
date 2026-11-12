# fhe-auditor Spec Sources

## Normative

- The scheme paper the target implements, for its noise formulas,
  transforms, and correctness condition:
  - BGV: Brakerski, Gentry, Vaikuntanathan, "(Leveled) Fully Homomorphic
    Encryption without Bootstrapping" (ITCS 2012).
  - BFV: Fan, Vercauteren, "Somewhat Practical Fully Homomorphic
    Encryption" (ePrint 2012/144), building on Brakerski (CRYPTO 2012).
  - CKKS: Cheon, Kim, Kim, Song, "Homomorphic Encryption for Arithmetic of
    Approximate Numbers" (ASIACRYPT 2017).
  - TFHE: Chillotti, Gama, Georgieva, Izabachene, "TFHE: Fast Fully
    Homomorphic Encryption over the Torus" (Journal of Cryptology 2020).
- Homomorphic Encryption Standard (HomomorphicEncryption.org, 2018):
  tables relating ring degree, total modulus, and secret distribution to a
  security level.
- Li, Micciancio, "On the Security of Homomorphic Encryption on Approximate
  Numbers" (EUROCRYPT 2021): defines IND-CPA-D; governs the decryption
  exposure checks.
- The target library's security documentation: the parameter checks it
  enforces and the decryption modes it offers.

## Informative

- Albrecht, Player, Scott, "On the Concrete Hardness of Learning with
  Errors" (2015) and the lattice estimator: security estimates (P8).
- Bossuat et al., "Security Guidelines for Implementing Homomorphic
  Encryption" (IACR Communications in Cryptology 1(4), 2025; ePrint
  2024/463): updated parameter guidance.
- Gentry, Halevi, Smart, "Homomorphic Evaluation of the AES Circuit"
  (CRYPTO 2012): special-modulus key switching.
- Li, Micciancio, Schultz, Sorrell, "Securing Approximate Homomorphic
  Encryption Using Differential Privacy" (CRYPTO 2022); Guo, Nabokov,
  Suvanto, Johansson, "Key Recovery Attacks on Approximate Homomorphic
  Encryption with Non-Worst-Case Noise Flooding Countermeasures" (USENIX
  Security 2024): sizing the flooding bound (P6).
- Cheon et al., "Attacks Against the IND-CPA-D Security of Exact FHE
  Schemes" (CCS 2024); Checri et al., "On the Practical CPA-D Security of
  'Exact' and Threshold FHE Schemes and Libraries" (CRYPTO 2024): P7.
- Chenal, Tang, "On Key Recovery Attacks against Existing Somewhat
  Homomorphic Encryption Schemes" (LATINCRYPT 2014): P9.
- Ducas, Stehle, "Sanitization of FHE Ciphertexts" (EUROCRYPT 2016): P11.
- Asharov et al., threshold FHE (EUROCRYPT 2012); Mouchet et al.,
  "Multiparty Homomorphic Encryption from Ring-Learning-with-Errors"
  (PoPETs 2021): smudging noise in threshold decryption (P10).
