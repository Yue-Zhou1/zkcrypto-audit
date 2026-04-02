---
name: fuzz-harness-gen
description: >
  Generate cargo-fuzz targets for Rust cryptographic code. User-triggered only
  and never auto-invoked by the audit flow. Produces crash and edge-case
  evidence for crypto-fp-check.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# fuzz-harness-gen

Generate `cargo-fuzz` targets for Rust cryptographic libraries and applications.

**This skill is user-triggered only.** It must never be auto-invoked by the
audit router or any other skill. Fuzz runs can be expensive (default timeout:
10 minutes per target).

## When to Use

- User explicitly requests fuzz testing
- User invokes this skill by name
- A Phase 2 finding needs additional crash/DoS or logic-divergence evidence

## When NOT to Use

- Never auto-trigger from audit flow
- Never run without explicit user request
- Code is not Rust
- cargo-fuzz is not installed (detect and warn)

## Prerequisites

Before generating targets, verify cargo-fuzz is available:

```bash
cargo fuzz --version 2>/dev/null || echo "ERROR: cargo-fuzz not installed. Install with: cargo install cargo-fuzz"
```

If not installed, inform the user and stop.

## Core Target Categories

1. **Deserialization** — reject malformed inputs without panic
2. **Point decompression** — invalid encodings must fail safely
3. **Proof verification** — malformed proofs should be rejected, not panic
4. **Hash and transcript APIs** — odd-length/context inputs should fail closed
5. **Parser/state transitions** — random byte streams should not trigger UB or invariant breaks

## Workflow

### Phase 1: Identify fuzz-worthy surfaces

- Read the target code and public APIs
- Prioritize parser, deserializer, verifier, and boundary-heavy functions
- Read `references/fuzz-checklist.md` for setup requirements

### Phase 2: Generate targets

- Read `references/target-patterns.md` for templates
- Generate `fuzz_target!` harnesses with minimal adapters
- Seed corpus when available and set time/iteration bounds

### Phase 3: Execute and triage

- Run `cargo fuzz run <target>` with a 10-minute default budget
- Classify crashes as panic/DoS vs logic/soundness implications
- Preserve crash artifacts for reproducible PoC evidence

## Output Contract

Produce fuzzing results that include:

- The generated target code
- The API/property surface being fuzzed
- Run budget and corpus strategy used
- PASS (no crash found in budget) or FAIL (crash/input found)
- If FAIL: minimized crashing input and reproduction command

## Reference Index

- [references/fuzz-checklist.md](references/fuzz-checklist.md)
- [references/target-patterns.md](references/target-patterns.md)
