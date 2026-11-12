# Decrypt Error Review Workflow

Executable review for decrypt path integrity, nonce lifecycle, and oracle
resistance.

1. **Inventory call sites.**
   `grep -rniE "encrypt|decrypt|seal|aead|gcm|chacha|cbc|hkdf|hpke|ecies"`.
   For each, record scheme, key source, nonce source, AD, and who can submit
   a ciphertext. Paths reachable by an unauthenticated party go first.

2. **Build the failure table.** For each decrypt entrypoint, enumerate
   every failure branch from bytes-in to the plaintext consumer: framing,
   key lookup, key unwrap, tag, padding, decompression, deserialization.
   Per branch record the return code, the externally visible behavior
   (status, connection close, retry), the side effects (logs, counters,
   metrics), and whether it runs before or after authentication succeeds.

3. **Decide on oracles.** Two branches that run before authentication and
   differ in anything the ciphertext sender can observe are a P4 candidate;
   confirm such failures collapse to one error surface. Branches after
   authentication may differ, unless the key is attacker-influenced (step 6).

4. **Locate the tag check and trace the plaintext.** Find where the tag is
   verified in each path, then follow the plaintext buffer backwards from
   every parse, log, and return. Anything that touches it before the check
   is P3. Write the AD byte string as built on the encrypt side and on the
   decrypt side and diff them field by field.

5. **Trace the nonce lifecycle.** For each (key, nonce source) pair,
   classify the nonce as counter, random, derived, or fixed, and follow it
   through generation, transport, persistence, and replay handling. For
   each of retry, parallel writers, and crash recovery, name the mechanism
   that prevents a repeat (P1, P2). Estimate messages per key against the
   mode's limit (P6). Generator quality goes to `randomness-auditor`.

6. **Check key selection.** Determine how the decryptor picks its key: key
   ID, trial decryption, password, peer-supplied. If the attacker influences
   it, look for a key commitment and a per-attempt success signal (P7).

7. **Tabulate derived keys.** One row per derived key: input secret, salt,
   context or `info`, output use. Two rows with the same inputs and
   different uses are P5. Confirm separation across encrypt/decrypt
   directions and role boundaries, not only across features.

8. **Manipulate composites.** For chunked formats, decide by reading which
   check rejects a dropped final chunk, two swapped chunks, and a chunk
   spliced from another stream (P9). For hybrid schemes, walk the hybrid
   section of `references/encryption-checklist.md` (P10).

9. **Hand off.** Compare observed issues against
   `references/finding-patterns.md`, fill the Output Contract fields, and
   forward surviving candidates to `crypto-fp-check`.

## Failure rules

- An oracle row is not closed on "the error is generic"; name the response,
  early exits, and side effects. Timing goes to `side-channel-auditor`.
- A uniqueness argument names the mechanism for retry, concurrency, and
  restart separately; "the library handles nonces" needs the documented
  behavior of the pinned version.
- Out-of-scope library internals are recorded as `residual_risk`, not passed.
