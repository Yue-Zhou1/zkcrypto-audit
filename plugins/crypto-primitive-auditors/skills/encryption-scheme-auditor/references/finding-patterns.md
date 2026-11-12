# encryption-scheme-auditor Finding Patterns

## P1: Reused nonce under same key

- **Pattern:** one (key, nonce) pair encrypts two messages: a retry that
  re-encrypts changed plaintext, two writers sharing a key, a counter reset
  on restart, a fixed nonce with a key that is not single-use.
- **Impact:** the repeated tuple reveals keystream structure and breaks
  confidentiality; in GCM it also yields the authentication key (forgery).

## P2: IV from predictable counter without uniqueness enforcement

- **Pattern:** the nonce source is a guessable counter or timestamp that
  nothing persists or fences, so it can collide under restart or fork.
- **Impact:** P1 on a predictable schedule; a predictable CBC IV also lets
  a chosen-plaintext attacker confirm guesses (BEAST against TLS 1.0).

## P3: Plaintext released before tag check

- **Pattern:** the decrypt pipeline exposes unauthenticated bytes before
  integrity verification: streaming `update` output parsed before `final`,
  in-place buffers read after failure, or decrypt-then-verify composition.
- **Impact:** chosen-ciphertext attacks on the consumer, as in EFAIL
  against OpenPGP clients that acted on plaintext despite a failed check.

## P4: Distinct decrypt errors expose oracle

- **Pattern:** padding, MAC, format, and key-lookup failures differ in
  error value, timing, connection handling, retries, or logging.
- **Impact:** the attacker distinguishes failure causes and iterates
  chosen-ciphertext attacks (Vaudenay on CBC; Bleichenbacher, Manger on RSA).

## P5: KDF context strings reused across roles

- **Pattern:** identical derivation context (salt, `info`, label) is used
  for independent protocol roles, directions, or algorithms.
- **Impact:** the roles share a key: reflection of messages between
  directions, nonce collisions across writers, cross-algorithm key reuse.

## P6: Random-nonce or volume limit exceeded

- **Pattern:** a long-lived key with random 96-bit nonces and no message
  count, no rekey, or a truncated or caller-chosen tag length.
- **Impact:** nonce collision becomes likely past the birthday bound (P1),
  or forgery probability rises with short tags.

## P7: Non-committing AEAD under an attacker-influenced key

- **Pattern:** AES-GCM or ChaCha20-Poly1305 where the key is derived from a
  password, supplied by the peer, or chosen by trial decryption.
- **Impact:** one ciphertext opens under several keys: defeats message
  franking ("invisible salamanders") and, with a success signal, tests many
  passwords per query (partitioning oracle attacks).

## P8: Security-relevant metadata outside the AD

- **Pattern:** key ID, algorithm or version, recipient, direction, sequence
  number, or record identifier travels beside the ciphertext unauthenticated.
- **Impact:** a valid ciphertext is replayed into another record, user, or
  session, or relabelled so decryption takes a legacy path (downgrade).

## P9: Chunked stream accepts truncation, reordering, or splicing

- **Pattern:** per-chunk AEAD without chunk index, final-chunk marker, or
  stream binding in the nonce or AD.
- **Impact:** an attacker drops the tail, reorders chunks, or mixes chunks
  from two streams under one key, and every chunk still verifies.

## P10: Hybrid composition gap

- **Pattern:** ECIES-style code that reuses an ephemeral key with a fixed
  nonce, omits the ephemeral public key from the KDF, skips validation of
  the received point, or reuses an HPKE context after cloning.
- **Impact:** nonce reuse under one derived key, benign malleability, or
  small-subgroup and invalid-curve exposure of the recipient key.
