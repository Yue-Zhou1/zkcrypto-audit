---
name: side-channel-auditor
description: >
  Audit passive leakage in cryptographic code: secret-dependent branches,
  table lookups and memory access, variable-time bignum and field
  arithmetic, early-exit comparisons, division and modular reduction,
  compiler-introduced branches, feature-flag backends, error-path timing,
  power-analysis exposure, and prover-side witness leakage. Use when a
  secret's influence on timing, cache state, or power is in question, or
  when a constant-time claim has to hold for the binary that ships.
allowed-tools: Read Grep Glob Bash
---

# side-channel-auditor

Single owner of timing, cache, memory-access, and power leakage analysis:
whether anything an observer can measure depends on a secret, in the
binary that ships and under the observer model the deployment implies.

**Core principle:** constant time is a property of machine code on a
target. A source-level argument is a hypothesis until the binary agrees.

## When to Use

- Reviewing secret-dependent control flow and memory-access behavior
- Auditing cache, branch-predictor, and power-related leakage surfaces
- Reviewing bignum, field, scalar, and reduction code that handles secrets
- Checking compiler and feature-flag constant-time regressions
- Verifying that zeroization and error-handling latency do not leak secrets
- Assessing witness leakage from a prover another party can observe

## When NOT to Use

- Active fault injection (RSA-CRT faults, DFA, verification skip) ->
  `fault-injection-auditor`; this skill covers passive leakage only
- Nonce bias, RNG quality, nonce reuse -> `randomness-auditor`
- Which backend or feature the dependency graph resolves ->
  `dependency-auditor`; this skill judges the backend once it is known
- Memory safety and zeroization mechanics in Rust -> `rust-crypto-safety`
- Decrypt-error semantics as protocol design -> `encryption-scheme-auditor`
- Sampler distribution correctness -> `lattice-auditor`
- Functional bugs with no leakage surface -> back to `crypto-audit-router`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The source uses masks and `subtle`, so it is constant-time" | Optimisers recognise mask idioms and may emit a branch. Compiler-introduced branches have produced real advisories in audited constant-time libraries. Only the release binary for the shipped target settles it |
| "The timing test passed" | A statistical test looks for a difference between the input classes it was given, at the sample count and on the machine it ran. It is evidence, not proof, and says nothing about other classes or targets |
| "The attacker is remote, so noise hides it" | Noise averages out with more samples; remote timing attacks on RSA and ECDSA have been demonstrated, and nonce attacks have worked with less than one bit of leakage per signature |
| "This is verification code, variable time is fine" | True only if every caller passes public data. The same routine is often reachable from signing, decryption, share generation, or a prover holding a private witness |
| "Only the error path differs, and errors are rare" | The attacker chooses the inputs, so the error path runs as often as they like. Padding and decryption oracles are error-path timing |
| "Division by a public constant compiles to a multiply" | Usually, not always. With some optimisation settings and targets the compiler emits a division instruction, whose latency can depend on the secret operand |

## Core Review Areas

1. Secret-dependent branches and control-flow decisions, loop bounds
2. Table lookups and cache-line dependent access patterns
3. Variable-time arithmetic and modular-reduction hotspots: bignum and
   field operations, inversion, division
4. Early-exit comparisons of secret-derived bytes
5. Compiler and feature-flag regressions that reintroduce leakage
6. Operational side effects (logging, errors, zeroization) that leak
   validity; secret-dependent lengths and encodings
7. Power-analysis exposure where the observer model includes it
8. Prover-side witness leakage

## Workflow

### Phase 1: Secret-bearing inventory

- Read `references/side-channel-checklist.md`
- State the observer model, then enumerate secret-bearing values and trace
  their influence on control and data flow

### Phase 2: Constant-time path analysis

- Execute `workflows/constant-time-review.md`: constant-time helpers and
  fallbacks, branch and memory-access patterns under secret variation,
  compiler settings and feature flags

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- If the codebase includes a ZK prover, read
  `references/zk-prover-patterns.md` before completing the pattern hunt
- Prioritize secret-branch, table-index, optimization, and error-latency
  findings

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route fault attacks to `fault-injection-auditor`, nonce bias and
  RNG issues to `randomness-auditor`, backend selection to
  `dependency-auditor`, zeroization mechanics to `rust-crypto-safety`

## Output Contract

Produce a side-channel handoff listing each candidate with:

- `secret_value_and_path` (the secret and the path it influences)
- `leakage_class` (`timing`, `cache`, `memory_access`, `power`, `operational`)
- `observer_model` (remote, co-located, or physical)
- `tool_evidence_status` (`dudect`-style test, `ctgrind`-style check,
  binary inspection, microbenchmark, or none)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/side-channel-checklist.md](references/side-channel-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/zk-prover-patterns.md](references/zk-prover-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/constant-time-review.md](workflows/constant-time-review.md)
