---
name: randomness-auditor
description: >
  Audit randomness and nonce lifecycles: CSPRNG/DRBG initialization and
  reseeding, entropy availability, fork/clone/snapshot duplication,
  deterministic nonce derivation (RFC 6979, EdDSA), and reuse across retries,
  crashes, persistence, and concurrent state. Use when any secret-dependent
  random value's generation or lifetime is in question.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# randomness-auditor

Cross-cutting auditor for how random values are generated AND how they live:
seeding, reseeding, duplication across process/VM boundaries, deterministic
derivation, and reuse windows created by retries, crashes, logs, and
concurrency.

## When to Use

- Auditing CSPRNG/DRBG construction, seeding, and reseed schedules
- Reviewing entropy availability at boot, in containers, or on embedded
  targets
- Checking fork/clone/VM-snapshot safety of RNG state
- Reviewing deterministic nonce derivation (RFC 6979 ECDSA, RFC 8032 EdDSA)
  and any deviation from the scheme's RFC
- Tracing nonce/salt/IV lifecycle across retry loops, crash recovery,
  persistence, logging, and concurrent use

## When NOT to Use

- AEAD mode/API misuse where generation is not in question (caller-supplied
  nonce binding, decrypt oracles) -> `encryption-scheme-auditor`
- Pure timing/cache/power leakage with no randomness involvement ->
  `side-channel-auditor`
- Signature verification-equation or encoding review -> the signature
  domain auditors
- Threshold nonce-share binding (FROST/MuSig2) -> `dkg-threshold-auditor`;
  threshold-ECDSA presignatures -> `threshold-ecdsa-auditor`

## Core Review Areas

1. Generator construction: approved DRBG (SP 800-90A) or platform CSPRNG;
   no user-space PRNGs (Mersenne Twister, rand()) for secrets
2. Seeding: entropy source, seed length, boot-time blocking behavior
   (getrandom vs /dev/urandom pre-init), embedded/first-boot entropy
3. Reseeding and state compromise recovery: reseed intervals, prediction
   resistance claims, backtracking resistance
4. Duplication: fork() and clone() detection, VM snapshot/resume, container
   image freezing, thread-local RNG cloning
5. Deterministic nonces: exact RFC 6979 / RFC 8032 conformance — message
   binding, key binding, no truncation drift, no "deterministic + counter"
   improvisation
6. Lifecycle: retries re-entering derivation with changed messages, crash
   recovery replaying persisted state, nonces in logs/telemetry, concurrent
   consumers sharing a generator without synchronization

## Workflow

### Phase 1: Random-value inventory

- Read `references/randomness-checklist.md`
- Enumerate every security-relevant random value (keys, nonces, salts, IVs,
  blinding factors, session IDs) and its generator

### Phase 2: Lifecycle tracing

- Execute `workflows/nonce-lifecycle-review.md`
- For each value: generation -> use -> persistence -> destruction, across
  process lifecycle events (fork, snapshot, crash, retry)

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize forked-state duplication, snapshot resumption, RFC 6979
  deviations, and persisted-counter replay

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route consumer-scheme impact to the signature, encryption, DKG,
  threshold-ECDSA, or VRF auditors as applicable

## Output Contract

Produce a randomness handoff that includes:

- `random_value_role`
- `lifecycle_path`
- `reuse_or_bias_condition`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/randomness-checklist.md](references/randomness-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/nonce-lifecycle-review.md](workflows/nonce-lifecycle-review.md)
