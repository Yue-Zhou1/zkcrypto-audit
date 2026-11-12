# ecc-pairing-auditor Spec Sources

## Normative

- RFC 9380, "Hashing to Elliptic Curves": `hash_to_curve` and
  `encode_to_curve`, `expand_message`, suite identifiers, cofactor
  clearing, and the domain separation (DST) requirements.
- CFRG Internet-Draft "BLS Signatures" (`draft-irtf-cfrg-bls-signature`,
  in the revision the target cites): KeyValidate (which rejects the
  identity only from revision -04 on), CoreVerify, Aggregate, the basic,
  message-augmentation, and proof-of-possession schemes, their ciphersuite
  IDs, and the point serialization the draft adopts.
- CFRG Internet-Draft "Pairing-Friendly Curves": BLS12-381 and BN curve
  parameters and group definitions.
- SEC 1 and SEC 2 (Standards for Efficient Cryptography Group): octet
  encoding of points, public key validation, and secp256k1/secp256r1
  parameters.
- NIST SP 800-186 and SP 800-56A: recommended curves and the public key
  validation routines required before key agreement.
- RFC 7748 (X25519, X448) and RFC 9496 (ristretto255, decaf448): cofactor
  handling by clamping, the all-zero output check, and prime-order
  encodings over cofactor curves.
- EIP-196, EIP-197, and EIP-2537: precompile encodings and their subgroup
  rules. Owned by `ethereum-crypto-auditor` and `onchain-verifier-auditor`;
  listed because they fix what an on-chain caller must validate itself.
- The curve library's documentation for the pinned version: which decode
  functions check the curve equation and which check group membership.

## Informative

- Boneh, Lynn, Shacham, "Short Signatures from the Weil Pairing"
  (ASIACRYPT 2001): the BLS equation.
- Ristenpart, Yilek, "The Power of Proofs-of-Possession" (EUROCRYPT 2007)
  and Boneh, Drijvers, Neven, "Compact Multi-Signatures for Smaller
  Blockchains" (ASIACRYPT 2018): rogue-key attacks and defences (P5).
- Bellare, Garay, Rabin, "Fast Batch Verification for Modular
  Exponentiation and Digital Signatures" (EUROCRYPT 1998): the
  small-exponents test behind random-coefficient batching (P7).
- Lim, Lee, "A Key Recovery Attack on Discrete Log-based Schemes Using a
  Prime Order Subgroup" (CRYPTO 1997) and Biehl, Meyer, Müller,
  "Differential Fault Attacks on Elliptic Curve Cryptosystems"
  (CRYPTO 2000): small-subgroup and invalid-curve attacks (P11).
- Barreto, Costello, Misoczki, Naehrig, Pereira, Zanon, "Subgroup Security
  in Pairing-Based Cryptography" (LATINCRYPT 2015): why G2 and GT
  membership matter.
- Bernstein, Lange, SafeCurves: twist security and completeness criteria.
