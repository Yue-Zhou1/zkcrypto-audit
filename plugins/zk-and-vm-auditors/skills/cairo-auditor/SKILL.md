---
name: cairo-auditor
description: >
  Audit Cairo and Starknet code for hint validation failures, felt252 overflow
  and comparison errors, builtin misuse, and Sierra-to-CASM soundness gaps,
  plus the Starknet contract surface that depends on them: storage layout,
  L1<->L2 messaging, account validation, and replay. Use when reviewing Cairo
  0 programs with hints, Cairo 1 contracts or libraries, prover hints, or
  Starknet-specific proof construction.
allowed-tools: Read Grep Glob Bash
---

# cairo-auditor

Domain auditor for Cairo (Cairo 0 with author-written hints, Cairo 1 compiled
through Sierra to CASM) and the Starknet contracts written in it.

**Core principle:** a hint is prover-run code that the proof does not cover.
Only the assertions and builtin checks that follow it are part of the
statement, and a felt252 has no size or sign until one of them says so.

## When to Use

- Auditing Cairo 1.0+ contracts or libraries
- Reviewing hint functions and their constraint enforcement (Cairo 0 `%{ %}`
  blocks, custom hint processors, oracle-style calls in executables)
- Checking felt252 arithmetic for silent wrapping and invalid comparisons
- Reviewing Sierra-to-CASM compilation correctness, gas and builtin accounting
- Checking builtin usage (range_check, pedersen, poseidon, ec_op, ecdsa)
- Reviewing Starknet storage layout, L1<->L2 handlers, and account contracts

## When NOT to Use

- Building initial protocol context for a new codebase -> `crypto-audit-context`
- Generic ZK circuit constraints outside Cairo, and STARK/AIR verifier
  review -> `zk-circuit-auditor`
- Solidity-side verifier or fact-registry contracts -> `onchain-verifier-auditor`
- Proof-settled rollup or bridge logic -> `proven-state-transition-auditor`
- Pedersen/Poseidon parameter and sponge analysis -> `hash-function-auditor`
- Declaring a suspected Cairo bug confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The hint computes it correctly" | Hints run only on the prover and are not part of the proven program. A malicious prover writes any value into the cell; only later assertions restrict it |
| "Cairo 1 has no hints, so nothing is prover-supplied" | The compiler emits hints for every nondeterministic libfunc, so soundness rests on the pinned compiler and corelib. Calldata, signatures, L1 payloads, and syscall results remain attacker-supplied |
| "felt252 is just a big integer" | Arithmetic is modulo the Stark prime: a - b with a < b is a huge positive value, and division multiplies by a modular inverse |
| "`assert_le(a, b)` proves a <= b" | The Cairo 0 helper range-checks b - a. With operands that were never bounded, a wrapped difference passes |
| "The value is small because of the arithmetic before it" | The prover can inject any felt on a path the range check skipped; smallness holds only where a range check enforces it |
| "Only our L1 contract sends messages to this handler" | Anyone can send an L1 message to any L2 handler. Without a `from_address` check the handler is public |

## Core Review Areas

1. Hint validation: prover hints trusted without constraint enforcement
2. felt252 overflow: arithmetic wrapping past the Stark prime silently,
   division and ordering semantics
3. Builtin misuse: range_check, pedersen, poseidon, ec_op, ecdsa used
   incorrectly
4. Sierra-to-CASM soundness: compiler guarantees relied upon but not checked,
   gas and builtin accounting, class-hash dispatch
5. Storage layout: collision between storage variables, mapping key domains
6. Starknet surface: L1<->L2 message authentication and encoding, account
   validation, signature and transaction replay

## Workflow

### Phase 1: Hint and constraint intake

- Read `references/cairo-checklist.md`
- Execute `workflows/hint-review.md`; treat every hint output as hostile
  until constrained

### Phase 2: Arithmetic and builtin review

- Check felt252 operations for silent overflow/wrapping
- Verify range_check usage covers all untrusted values
- Verify builtin arity and output validation

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`; prioritize unvalidated hints,
  missing range checks, storage collisions

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route STARK/AIR questions to `zk-circuit-auditor`, L1-side contracts
  to `onchain-verifier-auditor`, hash parameters to `hash-function-auditor`,
  settlement logic to `proven-state-transition-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

## Output Contract

Produce a Cairo handoff listing each candidate with:

- `cairo_target`: Cairo 0 or Cairo 1, compiler version, contract or program
- `site`: the hint functions, felt252 operations, or builtins involved
- `validation_gap`: the exact validation or constraint gap under review
- `issue_class`: `hint`, `arithmetic`, `builtin`, `compiler`, or
  `storage_or_contract`
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/cairo-checklist.md](references/cairo-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/hint-review.md](workflows/hint-review.md)
