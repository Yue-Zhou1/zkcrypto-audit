---
name: kani-harness-gen
description: >
  Generate Kani proof harnesses for Rust crypto code. User-triggered only —
  never auto-invoked by the audit flow. Produces formal verification evidence
  for crypto-fp-check.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# kani-harness-gen

Generate `#[kani::proof]` harnesses for formal verification of Rust cryptographic code.

**This skill is user-triggered only.** It must never be auto-invoked by the
audit router or any other skill. It consumes significant computation resources
(default timeout: 5 minutes per harness).

## When to Use

- User explicitly requests Kani verification
- User invokes this skill by name
- A Phase 2 finding needs stronger formal proof beyond the standard compilable PoC test

## When NOT to Use

- Never auto-trigger from audit flow
- Never run without explicit user request
- Code is not Rust
- cargo-kani is not installed (detect and warn)

## Prerequisites

Before generating harnesses, verify cargo-kani is available:

```bash
cargo kani --version 2>/dev/null || echo "ERROR: cargo-kani not installed. Install from https://github.com/model-checking/kani"
```

If not installed, inform the user and stop.

## Core Harness Categories

1. **Field arithmetic** — `a * inverse(a) == 1` for all non-zero `a`
2. **No-panic** — function does not panic for any input within type bounds
3. **Serialization roundtrip** — `deserialize(serialize(x)) == x`
4. **Constraint soundness** — satisfying witness implies valid statement
5. **State invariants** — API pre/post-conditions and rejection behavior over bounded inputs

## Limits

- Kani does not prove constant-time behavior or model timing/microarchitectural side channels.
- `kani::assume` constrains input space; it does not provide timing-side-channel guarantees.
- For timing analysis, route to `rust-crypto-safety` and tools like `dudect`/`ctgrind`.

## Workflow

### Phase 1: Identify verification targets

- Read the code under audit
- Identify functions with formal-verification-worthy properties
- Read `references/kani-checklist.md` for pre-generation checks

### Phase 2: Generate harnesses

- Read `references/harness-patterns.md` for templates
- Generate `#[kani::proof]` functions tailored to the target code
- Set appropriate `#[kani::unwind(N)]` bounds
- Write harnesses to a test file in the target project

### Phase 3: Execute and interpret

- Run `cargo kani --harness {name}` with 5-minute timeout
- If verification succeeds: property holds for all inputs within bounds
- If counterexample found: extract the failing input as PoC evidence
- Report results for use by `crypto-fp-check`

## Output Contract

Produce Kani verification results that include:

- The harness code generated
- The property being verified
- PASS (property holds) or FAIL (counterexample found)
- If FAIL: the counterexample input values for PoC evidence
- The kani::unwind bound used and its coverage implications

## Reference Index

- [references/kani-checklist.md](references/kani-checklist.md)
- [references/harness-patterns.md](references/harness-patterns.md)
