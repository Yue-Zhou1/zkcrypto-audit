# threshold-ecdsa-auditor Spec Sources

Checks are pinned to the construction/version they come from; the variants
are not interchangeable.

## Normative (per construction)

- GG18 — Gennaro, Goldfeder: "Fast Multiparty Threshold ECDSA with Fast
  Trustless Setup", CCS 2018 (ePrint 2019/114). NOTE: audit against the
  REVISED ePrint versions; the original omitted range-proof requirements
  later shown exploitable. Defines the Paillier-based MtA and MtAwc
  conversions and keygen commitment ordering.
- GG20 — Gennaro, Goldfeder: "One Round Threshold ECDSA with Identifiable
  Abort" (ePrint 2020/540). Defines presigning, one-round online signing,
  and §5 identifiable abort; source for presignature single-use and blame
  path checks.
- CGGMP21 — Canetti, Gennaro, Goldfeder, Makriyannis, Peled: "UC
  Non-Interactive, Proactive, Threshold ECDSA with Identifiable Aborts"
  (ePrint 2021/060). Defines Π^mod, Π^fac, Π^prm parameter proofs,
  ring-Pedersen commitments, ssid binding, and proactive resharing; source
  for the modulus-validity and session-binding checks.
- Lindell 2P-ECDSA — Lindell: "Fast Secure Two-Party ECDSA Signing",
  CRYPTO 2017 (ePrint 2017/552). Defines the two-party Paillier variant and
  the c_key consistency proof.
- Paillier — Paillier: "Public-Key Cryptosystems Based on Composite Degree
  Residuosity Classes", EUROCRYPT 1999. Normative for plaintext space,
  homomorphism, and why plaintext arithmetic is mod N (the mod N / mod q
  wraparound checks).

## Informative

- Alpha-Rays — Makriyannis, Peled: "Practical Key-Extraction Attacks in
  Leading MPC Wallets" (Fireblocks disclosure, ePrint 2021/1621): the
  missing-range-proof key-extraction class (P1/P2 patterns).
- Verichains TSSHOCK disclosures (2023) against GG18/GG20 implementations:
  forgery via ill-formed proofs; motivates verifying every ZK proof field,
  not just presence.
- binance-chain/tss-lib and ZenGo-X/multi-party-ecdsa security advisories:
  concrete instances of P1, P3, and P4 in widely-forked codebases.
