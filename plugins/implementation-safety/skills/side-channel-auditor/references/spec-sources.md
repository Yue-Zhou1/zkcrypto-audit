# side-channel-auditor Spec Sources

## Normative

- The target library's documented constant-time claims: which types,
  functions, and backends promise it. Defines what counts as a regression.
- CPU vendor guidance on data-independent timing: Intel's Data Operand
  Independent Timing (DOIT) guidance and Arm's Data Independent Timing
  (DIT) feature. Governs which instructions have operand-independent
  latency, and in which processor mode.
- ISO/IEC 17825, testing methods for the mitigation of non-invasive attack
  classes against cryptographic modules: the reference when a deployment
  claims evaluated resistance to timing or power analysis.

## Informative

- Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS,
  and Other Systems" (CRYPTO 1996); Kocher, Jaffe, Jun, "Differential
  Power Analysis" (CRYPTO 1999): the founding results.
- Brumley, Boneh, "Remote Timing Attacks Are Practical" (USENIX Security
  2003): remote observers and reduction timing (P8).
- Bernstein, "Cache-Timing Attacks on AES" (2005); Yarom, Falkner,
  "FLUSH+RELOAD" (USENIX Security 2014): table lookups (P2).
- AlFardan, Paterson, "Lucky Thirteen" (IEEE S&P 2013); Bock, Somorovsky,
  Young, "Return of Bleichenbacher's Oracle Threat" (USENIX Security
  2018): error-path oracles (P5).
- Jancar et al., "Minerva" (CHES 2020); Moghimi et al., "TPM-FAIL" (USENIX
  Security 2020); Aranha et al., "LadderLeak" (CCS 2020); Merget et al.,
  "Raccoon Attack" (USENIX Security 2021): length and bit-length leaks
  (P10).
- Bernstein et al., "KyberSlash" (TCHES 2025): secret-dependent division
  (P8).
- RUSTSEC-2024-0344 (`curve25519-dalek` scalar subtraction): a
  compiler-introduced branch in a constant-time library (P3).
- RUSTSEC-2023-0071 (`rsa` crate, Marvin attack): variable-time bignum
  arithmetic under RSA decryption (P7).
- Wang et al., "Hertzbleed" (USENIX Security 2022): power leakage seen as
  remote timing through frequency scaling.
- Reparaz, Balasch, Verbauwhede, "Dude, Is My Code Constant Time?" (DATE
  2017): the `dudect` statistical timing test.
- Langley, "ctgrind" (2010): marking secrets as undefined memory so a
  memory checker reports secret-dependent branches and indices.
- Almeida et al., "Verifying Constant-Time Implementations" (USENIX
  Security 2016); Pornin, "Why Constant-Time Crypto?" (BearSSL
  documentation): the property stated formally and catalogued in practice.
