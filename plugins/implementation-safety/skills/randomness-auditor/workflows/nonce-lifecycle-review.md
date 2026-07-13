# nonce-lifecycle-review.md

Executable review workflow for randomness generation and nonce lifecycles.

1. **Inventory random values.**
   `grep -rn "rand\|rng\|nonce\|seed\|entropy\|getrandom\|urandom\|OsRng\|thread_rng\|ChaCha.*Rng\|SystemRandom"`
   and build a table: value role (key, nonce, IV, salt, blinding factor,
   session ID) -> generator -> consumer scheme.

2. **Classify each generator.** Platform CSPRNG, SP 800-90A DRBG, userspace
   CSPRNG (which library/version), or non-cryptographic PRNG. Flag every
   non-cryptographic source feeding a security role immediately (P3).

3. **Check seeding and boot behavior.** Where does the seed come from, how
   long is it, and what happens before the OS pool initializes? Check
   embedded/container deployment docs for entropy plumbing.

4. **Check duplication boundaries.** Find every fork(), worker-pool spawn,
   and deployment mechanism involving images/snapshots/clones. For each,
   determine whether RNG state crosses the boundary live (P1/P2). Check the
   RNG library's fork-safety documentation explicitly.

5. **Check deterministic derivation against the RFC.** For RFC 6979 / RFC
   8032 claims, diff the derivation code against the RFC steps: hash
   truncation, key binding, loop-retry rule, extra-entropy handling. Any
   deviation routes to `spec-delta-checker` as well.

6. **Trace lifecycles.** For each nonce-like value: where is it created,
   which message does it bind to, is it persisted (when is it fsync'd),
   what do retry and crash paths do, does it appear in logs, and which
   threads can touch it concurrently? (P5/P6/P8/P9.)

7. **Assess consumer impact.** Translate each reuse/bias condition into the
   consuming scheme's failure mode (ECDSA key recovery, AEAD confidentiality
   collapse, DKG share exposure) — this sets severity and the cross-route.

8. **Produce the output contract.** For each candidate fill
   `random_value_role`, `lifecycle_path`, `reuse_or_bias_condition`,
   `evidence` (code path; for Critical/High a reproduction sketch, e.g. a
   fork-and-compare-streams test), `disposition`, and `next_route`
   (`crypto-fp-check`, plus the consumer-scheme auditor when impact spans
   domains).
