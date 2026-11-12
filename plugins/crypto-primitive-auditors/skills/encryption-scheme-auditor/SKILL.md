---
name: encryption-scheme-auditor
description: >
  Audit symmetric and hybrid encryption for AEAD nonce handling and usage
  limits, key commitment, associated-data binding, decrypt and padding
  oracle behavior, key-derivation and key-separation misuse, HPKE/ECIES
  composition, streaming AEAD truncation or reordering, and decrypt-error
  side effects. Use when reviewing encrypt/decrypt paths, envelope or file
  encryption, key wrapping, or hybrid public-key encryption.
allowed-tools: Read Grep Glob Bash
---

# encryption-scheme-auditor

Domain auditor for symmetric encryption, authenticated decryption, and the
hybrid constructions that wrap them.

**Core principle:** an AEAD's guarantees hold only while the caller keeps
its side: a nonce never repeats under a key, nothing is released before the
tag verifies, and the attacker did not choose the key.

## When to Use

- Reviewing AEAD mode integrations and nonce lifecycle handling
- Auditing decrypt error behavior for oracle side effects
- Checking associated-data binding and tag verification ordering
- Reviewing key-derivation context separation across protocol roles
- Validating key rotation and algorithm agility controls
- Reviewing HPKE or ECIES-style hybrid encryption, envelope encryption, key
  wrapping, or chunked encryption of large payloads

## When NOT to Use

- CSPRNG/DRBG seeding and fork or snapshot duplication behind a nonce ->
  `randomness-auditor`
- Constant-time analysis of tag comparison, padding checks, or cipher
  internals without encryption semantics -> `side-channel-auditor`
- ML-KEM encapsulation and decapsulation -> `pqc-kem-auditor`
- Homomorphic encryption -> `fhe-auditor`
- Signature schemes and their verification semantics ->
  `signature-scheme-auditor`
- Curve point validation inside the library that backs an ECIES or HPKE KEM
  -> `ecc-pairing-auditor`
- Marking a suspected encryption flaw as confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "Nonces are 96 random bits, a collision will not happen" | NIST SP 800-38D caps random-IV GCM at 2^32 encryptions per key. Long-lived or multi-writer keys cross that, and one repeat exposes the XOR of two plaintexts and the authentication key |
| "It is an AEAD, so a ciphertext decrypts to one plaintext" | AES-GCM and ChaCha20-Poly1305 are not key-committing. A ciphertext can be built to verify under several keys, which matters whenever the key is password-derived, attacker-supplied, or found by trial decryption |
| "Decrypt returns one generic error" | The oracle is whatever the sender of a ciphertext can observe: response timing, connection teardown versus continue, a retry, a log-triggered alert. Uniform error text closes one channel |
| "That field is validated elsewhere, it does not need to be in the AD" | The other check runs on an unauthenticated value. Key ID, version, recipient, direction, or sequence left outside the AD lets a valid ciphertext be replayed into another context |
| "Each chunk is authenticated, so the stream is" | Per-chunk tags do not stop dropping the tail, reordering, or splicing chunks between streams unless the chunk index and a final-chunk marker are bound |
| "We use a misuse-resistant mode, nonces no longer matter" | SIV modes with a repeated nonce still reveal whether two messages are equal, still have usage limits, and cannot release plaintext before the whole message is processed |

## Core Review Areas

1. Nonce generation, uniqueness, and reuse prevention under the same key
2. Usage limits: messages per key, bytes per message, tag length
3. AEAD tag verification-before-plaintext discipline
4. Associated-data binding and domain separation
5. Key commitment where the key is attacker-influenced or trial-selected
6. Padding/MAC oracle surfaces in decrypt error paths
7. KDF parameter/context separation and key lifecycle management
8. Hybrid composition: HPKE configuration, ECIES key binding and freshness
9. Streaming and chunked AEAD: truncation, reordering, splicing

## Workflow

### Phase 1: Encrypt/decrypt path intake

- Read `references/encryption-checklist.md`
- Map encrypt and decrypt entrypoints, including all error branches
- Pin scheme, mode, key source, nonce source, and AD for every call site

### Phase 2: Decrypt path, nonce, and tag review

- Execute `workflows/decrypt-error-review.md`
- Verify nonce creation, persistence, and replay safeguards
- Confirm tag checks complete before any plaintext is released, and that
  associated-data inputs match protocol intent in both directions

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize nonce reuse, decrypt oracle behavior, KDF context collisions,
  non-committing AEAD under attacker-influenced keys, and stream truncation

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route generator lifecycle to `randomness-auditor`, timing to
  `side-channel-auditor`, ML-KEM internals to `pqc-kem-auditor`, and curve
  point validation to `ecc-pairing-auditor`

## Output Contract

Produce an encryption handoff listing each candidate with:

- `scheme_and_path` (algorithm, mode, and the encrypt or decrypt call site)
- `nonce_and_key_lifecycle` (how nonce and key reach that call site)
- `oracle_surface` (decrypt error behavior a ciphertext sender can observe)
- `issue_class` (`nonce`, `usage_limit`, `tag_ordering`, `ad_binding`,
  `key_commitment`, `oracle`, `kdf`, `key_lifecycle`, `composition`)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/encryption-checklist.md](references/encryption-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/decrypt-error-review.md](workflows/decrypt-error-review.md)
