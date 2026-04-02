---
name: rust-crypto-safety
description: >
  Review Rust cryptographic code for implementation-level security bugs. Use
  when auditing constant-time behavior, secret zeroization, panic and overflow
  hazards, unsafe blocks, unchecked constructors, feature flags, or dependency
  hygiene in crypto crates.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# rust-crypto-safety

Implementation-safety auditor for cryptographic Rust code.

## When to Use

- Auditing Rust crates that implement or wrap cryptographic primitives
- Reviewing secret handling, constant-time behavior, and memory lifecycle
- Checking `unsafe`, raw pointers, `_unchecked` entrypoints, or manual concurrency traits
- Reviewing cargo features, dependencies, and panic/error behavior on crypto paths

## When NOT to Use

- Building protocol context before the code paths are identified
- Reviewing circuit constraints or verifier equations in ZK systems
- Declaring a finding confirmed without end-to-end verification

## Core Review Areas

1. Secret-dependent control flow and memory access
2. Secret lifecycle and zeroization
3. `unsafe`, unchecked constructors, and trait soundness
4. Panic, overflow, cast, and feature-flag hazards
5. Supply-chain and tool-assisted review

## Workflow

### Phase 1: Checklist pass

- Read `references/rust-checklist.md`
- Trace secret-bearing types through parsing, arithmetic, cloning, sharing, and drop paths
- Mark every `unsafe`, `_unchecked`, `unwrap`, `expect`, and `as` cast on the critical path

### Phase 2: Pattern hunt

- Read `references/finding-patterns.md`
- Treat secret-dependent timing, zeroization gaps, unsafe deserialization, and unsound `Send`/`Sync` as active search targets
- Check feature-flagged code separately; hidden security semantics count as real audit surface

### Phase 3: Tool-assisted review

- Read `references/toolchain.md`
- Run the smallest relevant tool set for the crate under review: static analysis first, then fuzzing, side-channel checks, and dependency inspection
- Use `audit-common` testing evidence language when describing gaps in coverage or missing negative tests

### Phase 4: Handoff

- Send suspected findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification and is suitable for indexing

## Output Contract

Produce an implementation-safety handoff that includes:

- The relevant secret-bearing types, unsafe paths, or dependency surfaces
- Concrete timing, zeroization, panic, cast, or concurrency hazards observed
- Tool-assisted evidence already gathered
- The next verification or reporting route

## Reference Index

- [references/rust-checklist.md](references/rust-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/toolchain.md](references/toolchain.md)
