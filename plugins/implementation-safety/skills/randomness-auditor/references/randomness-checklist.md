# randomness-auditor Checklist

## Generator construction and seeding

- [ ] Secrets come from an approved DRBG (NIST SP 800-90A: Hash_DRBG,
      HMAC_DRBG, CTR_DRBG) or the platform CSPRNG (getrandom(2),
      BCryptGenRandom, SecRandomCopyBytes) — never from user-space PRNGs
      (Mersenne Twister, xorshift, `rand()`, `math/rand`, `Math.random`).
- [ ] Seed material comes from an entropy source the platform documents as
      cryptographic (SP 800-90B-assessed or OS-pooled), with seed length >=
      the DRBG's required security strength.
- [ ] Boot-time behavior is explicit: reading /dev/urandom before the pool
      initializes returns data regardless; getrandom() without GRND_NONBLOCK
      blocks until seeded. Embedded/first-boot flows must not fall back to
      time(), PIDs, or MAC addresses.
- [ ] Containers/VMs: entropy availability is not assumed from the host
      without virtio-rng or equivalent plumbing.

## Reseeding and compromise recovery

- [ ] Reseed interval respects the DRBG's documented limits (SP 800-90A
      reseed_interval), and reseed pulls fresh entropy, not DRBG output.
- [ ] Prediction resistance is only claimed where each request actually
      pulls fresh entropy.
- [ ] DRBG state is never logged, serialized, or checkpointed.

## Duplication (fork/clone/snapshot)

- [ ] fork() safety: child processes reseed or the RNG detects PID change /
      fork-generation counters. Inherited userspace RNG state produces
      identical streams in parent and child.
- [ ] VM snapshot/resume safety: resumed clones must reseed (virtio-rng,
      VMGENID awareness) — snapshot-cloned services otherwise emit identical
      nonces (the classic duplicated-nonce-in-cloned-VM failure).
- [ ] Thread-local or object-cloned RNGs cannot be copied with live state.

## Deterministic nonce derivation

- [ ] RFC 6979 (deterministic ECDSA): k derives from HMAC(key, H(m)) per
      the RFC's exact loop; message binding uses the full hash; retries
      inside the RFC loop (k out of range) follow the specified re-derivation,
      not an ad-hoc counter.
- [ ] RFC 8032 (EdDSA): r = H(prefix || M) with the prefix from the key
      expansion; implementations must not substitute an external RNG or
      truncate the hash.
- [ ] No hybrid improvisations ("deterministic + timestamp", "RFC 6979 but
      cached across messages") without a written derivation argument;
      additive hedging (RFC 6979 §3.6 extra entropy) must still bind the
      message.
- [ ] The derived nonce is used for exactly one message; any code path that
      signs a DIFFERENT message with a cached k is a key-recovery bug.

## Lifecycle: retries, crashes, persistence, logging, concurrency

- [ ] Retry loops re-derive randomness per attempt; no reuse of a nonce
      after a failed/timed-out attempt where the message may have changed.
- [ ] Crash recovery: persisted counters/state used in derivation are
      monotonic ACROSS crashes (fsync'd before use, not after); replaying a
      persisted value must be impossible or detected.
- [ ] Nonces, seeds, and DRBG state never appear in logs, traces, metrics,
      core dumps, or error messages.
- [ ] Concurrent consumers either use per-thread generators or synchronized
      access; unsynchronized shared state can return duplicate outputs.
- [ ] Random values are zeroized after use where the platform allows.

## Cross-scheme integration handoffs

- [ ] ECDSA/Schnorr nonce reuse or bias -> key recovery: route consumer
      impact to the signature auditors (lattice attacks need only a few
      biased bits).
- [ ] AEAD IV/nonce collision -> `encryption-scheme-auditor`.
- [ ] DKG/threshold nonce shares -> `dkg-threshold-auditor` /
      `threshold-ecdsa-auditor`.
- [ ] VRF nonce generation (RFC 9381 §5.4.2 references RFC 6979-style
      derivation) -> the VRF review when that skill is present.
