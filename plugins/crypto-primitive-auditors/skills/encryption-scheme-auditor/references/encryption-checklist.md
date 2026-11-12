# Encryption Scheme Audit Checklist

## Nonce generation, reuse, and usage limits

- [ ] Nonce generation guarantees uniqueness per key and mode
- [ ] Nonce reuse is prevented across retries, restarts, and multi-process
      deployments
- [ ] Nonce storage/transport preserves full entropy and ordering
      requirements
- [ ] Counter nonces are persisted ahead of use or the key is fresh per
      process start; counter exhaustion fails instead of wrapping
- [ ] Writers sharing a key partition the nonce space (sender ID, direction
      bit), or each direction has its own key
- [ ] Random 96-bit GCM nonces: encryptions per key stay under 2^32 (NIST
      SP 800-38D) through rekeying or a counted limit
- [ ] CBC IVs are unpredictable, not merely unique; CTR counter blocks of
      different messages cannot overlap
- [ ] Tag length is fixed by configuration at full size; decrypt does not
      accept a shorter tag or a tag length taken from the message
- [ ] SIV-type modes: the equality leak under a repeated nonce is accepted
      by design, and nothing is released before the synthetic IV check

## AEAD verification discipline

- [ ] AEAD tag verification occurs before plaintext is returned or acted
      upon
- [ ] Decrypt failure paths avoid exposing partially decrypted plaintext
- [ ] Ciphertext length and framing checks occur before downstream parsing
- [ ] No attacker-reachable ciphertext is processed by an unauthenticated
      mode (ECB, bare CBC or CTR)
- [ ] Incremental decrypt APIs: no caller consumes `update` output before
      `final` succeeds, and in-place buffers are discarded on failure
- [ ] Encrypt-then-MAC compositions authenticate IV, AD, and ciphertext
      with unambiguous lengths and verify the MAC before any decryption

## Associated-data binding and key commitment

- [ ] All security-relevant metadata is included as associated-data
- [ ] Associated-data inputs are canonicalized consistently between encrypt
      and decrypt
- [ ] Context/domain tags are included for role and message-type separation
- [ ] Multi-field AD is encoded injectively (fixed-width or length-prefixed)
- [ ] Key ID, algorithm or version, and the owning record, user, or session
      are bound, so a ciphertext cannot be moved to another context
- [ ] Where the decryption key is password-derived, supplied by the
      counterparty, or found by trying several keys, the scheme is
      key-committing or an explicit key commitment is verified
- [ ] Trial decryption does not report per-key success or failure to the
      ciphertext's sender, and no flow treats an AEAD ciphertext as a
      commitment to its plaintext

## Oracle and error behavior

- [ ] Padding and MAC failures return indistinguishable decrypt errors
- [ ] Retry and logging paths do not create timing or detail oracles
- [ ] Backoff and lockout controls are applied to repeated decrypt failures
- [ ] No path removes CBC padding before authenticating the ciphertext
- [ ] RSA key transport uses OAEP with uniform decode errors; PKCS#1 v1.5
      decryption is absent or, on a padding failure, continues with a
      substitute secret (random as in TLS, or the deterministic
      pseudorandom one of implicit rejection) instead of an error

## KDF and key lifecycle

- [ ] KDF contexts are separated for encryption, authentication, and key
      wrapping roles
- [ ] Key rotation and algorithm agility are documented and enforced
- [ ] Legacy mode compatibility does not silently weaken verification
      requirements
- [ ] Passwords go through a password-hashing KDF with a per-secret salt
      and a stated cost, never HKDF or a bare hash
- [ ] HKDF `info` differs for every derived key and names protocol, role,
      and direction; salt and input keying material are not swapped
- [ ] A raw Diffie-Hellman output is never used directly as a cipher key,
      and one key is never used with two algorithms or modes
- [ ] The field that selects algorithm or version on decrypt is
      authenticated; an attacker cannot steer decryption to a legacy path

## Hybrid and streaming constructions

- [ ] HPKE: mode and KEM/KDF/AEAD identifiers are pinned, `info` carries
      application context, and a sender context is never cloned or restored
      from serialized state
- [ ] ECIES-style: the KDF input includes the ephemeral public key (SEC 1
      leaves this to the optional SharedInfo1), which is validated on
      receipt (curve rules: `ecc-pairing-auditor`) and fresh per message
      wherever the nonce is fixed
- [ ] The design does not assume sender authentication from HPKE base mode
      or ECIES; anyone can encrypt to a public key
- [ ] Each chunk's nonce or AD binds the chunk index and a final-chunk
      marker; a stream that ends without the final chunk is an error
- [ ] Chunks are bound to their stream by a per-stream key or an
      authenticated header that covers chunk size and parameters
