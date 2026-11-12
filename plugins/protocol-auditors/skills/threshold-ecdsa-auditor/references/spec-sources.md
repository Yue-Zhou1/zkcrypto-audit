# threshold-ecdsa-auditor Spec Sources

Checks are pinned to the construction/version they come from; the variants
are not interchangeable.

## Normative (per construction)

- GG18 — Gennaro, Goldfeder: "Fast Multiparty Threshold ECDSA with Fast
  Trustless Setup", CCS 2018 (ePrint 2019/114). NOTE: audit against the
  latest ePrint revision (December 2021, "fixes some issues in the protocol
  and security proof"). The CCS 2018 version describes a variant that
  removes the MtA range proofs (its Section 5), later shown exploitable
  (Alpha-Rays), and its keygen asks only for a proof of knowledge of the
  factorization of N. Defines the Paillier-based MtA and MtAwc conversions
  and keygen commitment ordering.
- GG20 — Gennaro, Goldfeder: "One Round Threshold ECDSA with Identifiable
  Abort" (ePrint 2020/540). Defines presigning, one-round online signing,
  and the identifiable-abort (blame) protocol; source for presignature
  single-use and blame path checks. The ePrint revisions fix issues in the
  MtA share conversion and a typo in the identification protocol.
- CGGMP21 — Canetti, Gennaro, Goldfeder, Makriyannis, Peled: "UC
  Non-Interactive, Proactive, Threshold ECDSA with Identifiable Aborts"
  (ePrint 2021/060). Defines Π^mod, Π^fac, Π^prm parameter proofs,
  ring-Pedersen commitments, ssid binding, and proactive key refresh; source
  for the modulus-validity and session-binding checks.
- Lindell 2P-ECDSA — Lindell: "Fast Secure Two-Party ECDSA Signing",
  CRYPTO 2017 (ePrint 2017/552). Defines the two-party Paillier variant and
  the c_key consistency proof.
- Paillier — Paillier: "Public-Key Cryptosystems Based on Composite Degree
  Residuosity Classes", EUROCRYPT 1999. Normative for plaintext space,
  homomorphism, and why plaintext arithmetic is mod N (the mod N / mod q
  wraparound checks).

## Informative

- Alpha-Rays — Tymokhanov, Shlomovits: "Alpha-Rays: Key Extraction Attacks
  on Threshold ECDSA Implementations" (ePrint 2021/1621): two MtA
  key-extraction attacks on GG18/GG20 implementations — "fast" MtA run
  without range proofs (P1), and a missing Paillier key-size check.
- BitForge — Makriyannis, Yomtov, Galansky (Fireblocks): "Practical
  Key-Extraction Attacks in Leading MPC Wallets" (ePrint 2023/1234,
  CCS 2024): CVE-2023-33241, key extraction from GG18/GG20 parties that
  accept a Paillier modulus with small factors (P2), and CVE-2023-33242,
  Lindell17 implementations that keep signing after a failed signature.
- Verichains TSSHOCK (Black Hat USA 2023) against GG18/GG20/CGGMP21
  implementations: key extraction by a single party that forges the
  discrete-log proof (dlnproof) of its auxiliary parameters, through
  ambiguous hash-input encoding or too few proof iterations; motivates
  checking how every ZK proof is hashed and parameterized, not just its
  presence.
- tss-lib security advisories (bnb-chain/tss-lib, formerly
  binance-chain/tss-lib): GHSA-h24c-6p6p-m3vx (Paillier modulus with small
  factors leaks key shares; P2), CVE-2022-47930 (session identifier not
  bound into proofs, allowing replay), CVE-2022-47931 (hash-value
  collision). Concrete instances in a widely-forked codebase.
