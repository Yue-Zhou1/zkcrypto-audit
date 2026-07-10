# randomness-auditor Spec Sources

## Normative

- NIST SP 800-90A Rev. 1 — "Recommendation for Random Number Generation
  Using Deterministic Random Bit Generators". Defines Hash_DRBG, HMAC_DRBG,
  CTR_DRBG, reseed_interval limits, prediction resistance, and backtracking
  resistance; source for all DRBG-construction and reseed checks.
- NIST SP 800-90B — "Recommendation for the Entropy Sources Used for Random
  Bit Generation". Governs entropy-source assessment claims behind seeding.
- RFC 6979 — "Deterministic Usage of the Digital Signature Algorithm (DSA)
  and Elliptic Curve Digital Signature Algorithm (ECDSA)". Normative for the
  HMAC-based k derivation loop, message/key binding, the in-loop retry rule,
  and §3.6 additional-entropy hedging.
- RFC 8032 — "Edwards-Curve Digital Signature Algorithm (EdDSA)". Normative
  for r = H(prefix || M) deterministic nonce derivation in Ed25519/Ed448.
- getrandom(2) Linux man page / kernel documentation — normative for
  blocking semantics before pool initialization and GRND_NONBLOCK behavior.

## Informative

- Heninger, Durumeric, Wustrow, Halderman — "Mining Your Ps and Qs:
  Detection of Widespread Weak Keys in Network Devices" (USENIX Security
  2012): boot-time entropy starvation producing shared RSA factors (P7).
- Everspaugh, Zhai, Jellinek, Ristenpart, Swift — "Not-So-Random Numbers in
  Virtualized Linux and the Whirlwind RNG" (IEEE S&P 2014): VM
  snapshot/resume randomness reuse (P2).
- Breitner, Heninger — "Biased Nonce Sense: Lattice Attacks against Weak
  ECDSA Signatures in Cryptocurrencies" (FC 2019): how little nonce bias
  suffices for key recovery (P4/P6 impact calibration).
- CVE-2013-1445 / Debian OpenSSL CVE-2008-0166 postmortems: canonical
  weak-seeding case studies (P3).
