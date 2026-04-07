---
name: folding-scheme-auditor
description: >
  Audit folding scheme and IVC implementations for accumulator soundness, step
  circuit binding, cycle-of-curves correctness, and running instance completeness.
  Use when reviewing Nova, HyperNova, ProtoStar, or custom folding-based proof
  systems in Rust.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# folding-scheme-auditor

Domain auditor for folding scheme and incrementally verifiable computation (IVC) systems.

## When to Use

- Reviewing Nova, HyperNova, ProtoStar, or Sonobe-based Rust implementations
- Auditing accumulator update logic and relaxed R1CS folding equations
- Checking IVC step circuit binding and public input threading across steps
- Reviewing cycle-of-curves field selection and cross-curve consistency
- Auditing running instance completeness and error term construction

## When NOT to Use

- Standard Groth16, PLONK, or STARKs without folding (use `zk-circuit-auditor`)
- Recursive plonky2/3 circuits (use `zk-circuit-auditor` + `plonky2-patterns.md`)
- Declaring accumulator bugs confirmed without `crypto-fp-check`

## Core Review Areas

1. Accumulator soundness — relaxed R1CS folding equation correctness, error term construction and range
2. IVC step circuit binding — public input threading across steps, base case handling
3. Cycle-of-curves consistency — field element compatibility, cross-curve public input encoding
4. Running instance completeness — witness availability per step, error accumulation bounds
5. Folding verifier equation — cross-term commitments, challenge derivation, final SNARK proof

## Workflow

### Phase 1: Checklist pass

- Read `references/folding-scheme-checklist.md`
- Identify the folding scheme variant (Nova, HyperNova, ProtoStar) and the cycle of curves
- Map all accumulator update sites and IVC step boundaries

### Phase 2: Accumulator review

- Execute `workflows/accumulator-review.md`
- Verify the relaxed R1CS equation, error term, and cross-term commitment at every folding step
- Treat any unchecked accumulator field as a soundness candidate until disproven

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize IVC step binding gaps, cycle-of-curves field mismatches, and base case soundness failures
- Check the final SNARK proof over the last accumulator for correct key binding

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce a folding-scheme handoff that includes:

- The accumulator state, step circuit, or verifier equation involved
- The exact folding equation gap, field mismatch, or binding failure
- Whether the issue is accumulator soundness, IVC threading, curve consistency, or verifier equation
- The next verification or reporting route

## Reference Index

- [references/folding-scheme-checklist.md](references/folding-scheme-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/accumulator-review.md](workflows/accumulator-review.md)
