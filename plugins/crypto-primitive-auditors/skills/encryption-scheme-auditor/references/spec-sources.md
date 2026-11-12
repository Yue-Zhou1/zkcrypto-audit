# encryption-scheme-auditor Spec Sources

## Normative

- RFC 5116, "An Interface and Algorithms for Authenticated Encryption": the
  AEAD interface and the nonce-uniqueness contract every check here assumes.
- NIST SP 800-38D (GCM/GMAC): IV construction, the 2^32 invocation limit
  for random IVs, message length limit, and short-tag guidance.
- RFC 8439 (ChaCha20-Poly1305): nonce and counter layout, message length
  limit, one-time Poly1305 key derivation.
- NIST SP 800-38A (CBC, CTR and other confidentiality modes) and SP 800-38C
  (CCM): IV requirements for the non-AEAD and CCM paths.
- RFC 5297 (AES-SIV) and RFC 8452 (AES-GCM-SIV): what nonce-misuse
  resistance does and does not provide.
- RFC 5869 (HKDF) and NIST SP 800-108 / SP 800-56C: extract-and-expand,
  context (`info`) binding, and key derivation after key agreement.
- RFC 9180 (HPKE): modes, KEM/KDF/AEAD identifiers, context sequence
  numbers, and the `info` and exporter interfaces.
- RFC 8017 (PKCS #1 v2.2): RSAES-OAEP and RSAES-PKCS1-v1_5 for key
  transport error handling.
- SEC 1 (Standards for Efficient Cryptography Group) and ISO/IEC 18033-2:
  ECIES as standardized, including what the KDF input covers (in SEC 1 the
  shared secret plus optional SharedInfo1; the ephemeral public key is not
  a mandatory input).

## Informative

- Joux, "Authentication Failures in NIST version of GCM": key recovery for
  the authenticator after one nonce repeat (P1).
- Böck, Zauner, Devlin, Somorovsky, Jovanovic, "Nonce-Disrespecting
  Adversaries: Practical Forgery Attacks on GCM in TLS" (2016): nonce reuse
  found in deployed servers.
- Vaudenay, "Security Flaws Induced by CBC Padding" (EUROCRYPT 2002);
  Bleichenbacher (CRYPTO 1998) and Manger (CRYPTO 2001) on RSA encryption
  padding: the oracle classes behind P4.
- Dodis, Grubbs, Ristenpart, Woodage, "Fast Message Franking: From
  Invisible Salamanders to Encryptment" (CRYPTO 2018); Len, Grubbs,
  Ristenpart, "Partitioning Oracle Attacks" (USENIX Security 2021);
  Albertini et al., "How to Abuse and Fix Authenticated Encryption Without
  Key Commitment" (USENIX Security 2022): key commitment (P7).
- Hoang, Reyhanitabar, Rogaway, Vizár, "Online Authenticated-Encryption and
  its Nonce-Reuse Misuse-Resistance" (CRYPTO 2015): the STREAM construction
  for chunked AEAD (P9).
- CFRG draft "Usage Limits on AEAD Algorithms"
  (`draft-irtf-cfrg-aead-limits`): per-key and per-message bounds across
  modes (P6).
- Poddebniak et al., "Efail" (USENIX Security 2018): plaintext acted on
  without integrity (P3).
