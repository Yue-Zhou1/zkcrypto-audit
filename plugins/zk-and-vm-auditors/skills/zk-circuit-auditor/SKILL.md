---
name: zk-circuit-auditor
description: >
  Audit ZK circuits, proof systems, and verifier code for soundness and
  transcript failures. Use when reviewing witness constraints, Fiat-Shamir
  flows, KZG/PCS setup assumptions, public input encoding, or recursive proof
  threading.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# zk-circuit-auditor

Domain auditor for circuit soundness and verifier logic.

## When to Use

- Auditing Circom, Noir, Halo2, Groth16, PLONKish, or custom ZK proof code
- Reviewing witness assignment, constraint completeness, and public input handling
- Checking Fiat-Shamir transcript construction and challenge timing
- Reviewing verifier equations, KZG/SRS assumptions, or recursive proof plumbing
- Auditing generic STARK/AIR systems outside Cairo/Starknet: AIR transition
  and boundary constraints, trace padding, composition polynomials, FRI
  query schedules, and DEEP out-of-domain sampling

## When NOT to Use

- Building the initial threat model for an unfamiliar cryptographic codebase
- Verifying whether a suspected finding is report-ready
- Checking prior-art or disclosure state

## Core Review Areas

1. Constraint soundness and witness binding
2. Transcript completeness and ordering
3. Verifier equation and public input consistency
4. Setup, batching, and recursion assumptions

## Workflow

### Phase 1: Constraint and witness review

- Read `references/zk-checklist.md`
- If the codebase uses circom, halo2, arkworks, or plonky2/3, read the corresponding library pattern file in `references/` before proceeding
- If the target is a STARK/AIR system (AIR constraints, execution trace, composition polynomial, FRI), read `references/stark-air-patterns.md` and execute `workflows/stark-air-review.md`; Cairo/Starknet language and hint review routes to `cairo-auditor`, and standalone FRI-as-PCS review routes to `commitment-scheme-auditor`
- Map every assigned witness value to its constraining equations
- Flag unconstrained signals, non-native arithmetic width gaps, and lookup multiplicity edge cases

### Phase 2: Transcript review

- Read `references/finding-patterns.md`
- Execute `workflows/transcript-review.md`
- Treat any missing absorb, context-binding field, or early challenge as a soundness candidate until disproven

### Phase 3: Setup and verifier review

- Execute `workflows/setup-review.md`
- Verify the exact verifier equation, setup provenance, opening-point ownership, and recursion threading

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the claim survives verification

## Output Contract

Produce a circuit-audit handoff that includes:

- The affected constraints, transcript steps, verifier equations, or setup assumptions
- The exact witness/public-input or proof path involved
- For STARK/AIR targets: the AIR constraint group, trace segment,
  composition/quotient step, or FRI parameter at issue
- Whether the issue is a soundness, privacy, or batching candidate
- The next verification or reporting route

## Reference Index

- [references/zk-checklist.md](references/zk-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/circom-patterns.md](references/circom-patterns.md)
- [references/halo2-patterns.md](references/halo2-patterns.md)
- [references/arkworks-patterns.md](references/arkworks-patterns.md)
- [references/plonky2-patterns.md](references/plonky2-patterns.md)
- [references/stark-air-patterns.md](references/stark-air-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/transcript-review.md](workflows/transcript-review.md)
- [workflows/setup-review.md](workflows/setup-review.md)
- [workflows/stark-air-review.md](workflows/stark-air-review.md)
