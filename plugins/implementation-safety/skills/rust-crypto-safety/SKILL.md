---
name: rust-crypto-safety
description: >
  Review Rust cryptographic code for implementation-level security bugs:
  unsafe blocks and FFI, panics and arithmetic overflow on untrusted input,
  secret zeroization and lifetime, unchecked constructors, manual Send/Sync,
  numeric casts, and security-significant cfg/feature gating. Use when
  auditing Rust crates that implement or wrap cryptography, including zkVM
  guest binaries.
allowed-tools: Read Grep Glob Bash
---

# rust-crypto-safety

Implementation-safety auditor for cryptographic Rust code: language and build
hazards around secrets and untrusted input. The cryptographic construction is
covered by the domain auditors.

## When to Use

- Auditing Rust crates that implement or wrap cryptographic primitives
- Reviewing secret-bearing types: construction, cloning, sharing, and drop
- Checking `unsafe`, raw pointers, FFI, `_unchecked` entrypoints, or manual
  `Send`/`Sync` on cryptographic state
- Reviewing panic, overflow, and cast behaviour on parser, verifier, and zkVM
  guest paths
- Checking what `cfg` and cargo features change about validation or secrets

## When NOT to Use

- Proving a timing, cache, or power leak, or reviewing constant-time
  arithmetic in depth -> `side-channel-auditor` (this skill only flags
  obvious secret-dependent branches and lookups for it)
- Dependency versions, advisories, feature unification across the build
  graph, forks, and lockfiles -> `dependency-auditor`
- RNG seeding and nonce lifecycle -> `randomness-auditor`
- Circuit constraints or verifier equations -> `zk-circuit-auditor`
- zkVM guest/host trust boundary and proof-system behaviour -> `zkvm-auditor`
- Fault injection and glitch resistance -> `fault-injection-auditor`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The `unsafe` block has a SAFETY comment" | A comment states an invariant; check that every caller, including public ones, upholds it |
| "It only panics on malformed input" | Malformed input is what an attacker sends. A panic in a verifier, parser, or guest is denial of service or a failed proof |
| "Overflow would panic in debug builds" | Release builds wrap unless `overflow-checks` is set; read the profile that ships, including the guest profile |
| "The key type derives `Zeroize`" | Deriving is not dropping. Check `ZeroizeOnDrop`, copies made by `Clone`, moves into buffers, and intermediates on the stack |
| "That path is behind a feature flag nobody enables" | Features unify across the dependency graph; another crate can turn it on |
| "`_unchecked` is only called internally" | Trace every call site; a `pub` wrapper or a re-export makes it reachable with unvalidated data |

## Core Review Areas

1. `unsafe`, raw pointers, FFI, `transmute`, and `_unchecked` constructors:
   the exact soundness invariant and who upholds it
2. Panics on untrusted input: `unwrap`, `expect`, indexing, slicing, `assert`,
   division, and allocation sized by input
3. Arithmetic: overflow semantics under the shipped profile, `as` casts that
   truncate or change sign, length and offset computations
4. Secret lifecycle: zeroization on drop, `Clone`/`Copy`/`Debug` on secret
   types, secrets in error values and logs
5. Concurrency: manual `Send`/`Sync`, interior mutability, and shared mutable
   cryptographic state
6. `cfg` and feature gating that changes validation, backends, or test-only
   bypasses
7. Error behaviour: distinguishable failures that form an oracle, and errors
   swallowed on verification paths

## Workflow

### Phase 1: Checklist pass

- Read `references/rust-checklist.md`
- Trace secret-bearing types through parsing, arithmetic, cloning, sharing,
  and drop paths
- Mark every `unsafe`, `_unchecked`, `unwrap`, `expect`, index, and `as` cast
  on the critical path, and decide for each whether untrusted input reaches it

### Phase 2: Pattern hunt

- Read `references/finding-patterns.md`
- Treat zeroization gaps, unsafe deserialization, unsound `Send`/`Sync`, and
  input-reachable panics as active search targets
- Review feature-flagged and `cfg`-gated code as separate audit surface
- Note secret-dependent branches or lookups you pass; do not analyse them
  here

### Phase 3: Tool-assisted review

- Read `references/toolchain.md`
- Run the smallest relevant tool set for the crate under review
- Use the evidence categories from `audit-common` when describing gaps in
  tests

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route secret-dependent timing to `side-channel-auditor`, dependency
  and feature-graph questions to `dependency-auditor`, RNG and nonce handling
  to `randomness-auditor`
- Recommend `fuzz-harness-gen` for parsers and hand-rolled arithmetic, and
  `kani-harness-gen` for bounded `unsafe` or overflow claims; both are
  user-triggered

## Output Contract

Produce an implementation-safety handoff listing each candidate with:

- `location`: file, function, and line
- `hazard_class`: unsafe, panic, overflow or cast, zeroization, concurrency,
  feature gating, or error oracle
- `untrusted_input_path`: how attacker-controlled data reaches it, or which
  secret is exposed
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/rust-checklist.md](references/rust-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/toolchain.md](references/toolchain.md)
