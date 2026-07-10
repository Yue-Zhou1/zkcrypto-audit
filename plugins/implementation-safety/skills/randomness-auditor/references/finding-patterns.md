# randomness-auditor Finding Patterns

## P1: Forked RNG state duplication

- **Pattern:** userspace CSPRNG seeded once, then fork()/worker-pool spawn;
  children inherit identical state.
- **Root cause:** RNG libraries without fork detection (no PID/generation
  check); pre-fork initialization "for performance".
- **Impact:** identical nonces/keys across workers; for ECDSA one duplicate
  nonce pair = private key.

## P2: VM snapshot/clone nonce repetition

- **Pattern:** service embedded in a machine image or resumed from
  snapshots; RNG state frozen in the image.
- **Root cause:** no VMGENID/virtio-rng reseed hook on resume.
- **Impact:** fleet-wide duplicated randomness (duplicated TLS
  session keys, repeated ECDSA k across clones).

## P3: Weak generator for secrets

- **Pattern:** `math/rand`, `random.random()`, Mersenne Twister, `rand()`
  seeded with time() feeding keys, salts, or nonces.
- **Impact:** outputs predictable from a handful of observations; wallets
  and tokens generated this way are enumerable.

## P4: RFC 6979 deviation

- **Pattern:** "deterministic ECDSA" that truncates the message hash
  differently than the RFC, caches k across messages, or mixes in a
  non-monotonic counter.
- **Impact:** same-k-different-message (immediate key recovery) or biased k
  (lattice key recovery from a few hundred signatures).

## P5: Crash-recovery counter replay

- **Pattern:** derivation counter persisted AFTER use (write-behind); crash
  between use and persist replays the counter on restart.
- **Impact:** nonce/IV reuse on the first message(s) after every crash —
  looks intermittent, is deterministic.

## P6: Retry-loop nonce reuse

- **Pattern:** network retry re-signs an amended message (new fee, new
  timestamp) with the nonce from the failed attempt.
- **Impact:** two messages under one k: ECDSA/Schnorr key extraction.

## P7: Boot-time entropy starvation fallback

- **Pattern:** embedded/first-boot code that catches an entropy error and
  falls back to time/serial/MAC seeding.
- **Impact:** factory-identical or brute-forceable keys (the classic
  "Mining your Ps and Qs" shared-factor RSA population).

## P8: Concurrent generator races

- **Pattern:** shared DRBG accessed from multiple threads without locking;
  interleaved state updates can return identical output blocks.
- **Impact:** duplicated nonces under load only — invisible in unit tests.

## P9: Secrets in logs and telemetry

- **Pattern:** debug logging of "k", seeds, or DRBG internal state; crash
  dumps shipping RNG state to third-party crash tooling.
- **Impact:** retrospective key recovery from log archives.
