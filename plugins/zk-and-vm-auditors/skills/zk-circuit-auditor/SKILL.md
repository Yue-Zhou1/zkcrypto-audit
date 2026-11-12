---
name: zk-circuit-auditor
description: >
  Audit ZK circuits, proof systems, and verifier code for soundness and
  statement-binding failures: under-constrained witnesses, range and
  non-native arithmetic gaps, lookup and selector misuse, public input
  encoding, verifier equations, setup provenance, and recursive proof
  threading. Use when reviewing Circom, Halo2, arkworks, plonky2/3, Groth16,
  PLONKish, or generic STARK/AIR code, witness constraints, circuit-side
  Fiat-Shamir flows, or KZG/PCS setup assumptions.
allowed-tools: Read Grep Glob Bash
---

# zk-circuit-auditor

Domain auditor for circuit soundness and verifier logic: whether the
constraints admit only the intended witnesses, and whether the verifier
checks the statement the application relies on.

**Core principle:** only constraints bind the prover. Witness generators,
hints, and tests describe the honest prover; the attacker writes their own.

## When to Use

- Auditing Circom, Halo2, arkworks, plonky2/3, Groth16, PLONKish, or custom
  ZK proof code, and the proof-system layer under Noir or gnark circuits
- Reviewing witness assignment, constraint completeness, public input handling
- Checking Fiat-Shamir binding of this circuit's statement and challenge timing
- Reviewing verifier equations, KZG/SRS assumptions, recursive proof plumbing
- Auditing generic STARK/AIR systems outside Cairo/Starknet: AIR transition
  and boundary constraints, trace padding, composition polynomials, FRI
  query schedules, and DEEP out-of-domain sampling

## When NOT to Use

- Cairo and Starknet code, hints, Sierra/CASM -> `cairo-auditor`
- Noir unconstrained functions, oracles, Brillig/ACIR -> `noir-auditor`
- gnark frontend API and Go witness pipeline -> `gnark-auditor`
- Folding and IVC accumulators -> `folding-scheme-auditor`
- zkVM runtime, guests, precompiles, continuations -> `zkvm-auditor`
- Verifier contracts and precompile call sites -> `onchain-verifier-auditor`
- State transition and settlement around the proof ->
  `proven-state-transition-auditor`
- Round-by-round transcript review -> `fiat-shamir-auditor`
- KZG/FRI/IPA opening equations, SRS validation, degree bounds ->
  `commitment-scheme-auditor`
- Initial threat model for an unfamiliar codebase -> `crypto-audit-context`
- Verifying whether a suspected finding is report-ready -> `crypto-fp-check`
- Checking prior-art or disclosure state -> `zkbugs-index`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The witness generator computes it correctly" | The generator is the honest prover. A malicious prover supplies any assignment that satisfies the constraints, so a value that is computed but not constrained is free |
| "All tests pass and proofs verify" | Passing tests show completeness: honest witnesses satisfy the constraints. Soundness needs a negative test where a tampered witness is rejected |
| "It is range-checked earlier" | A check binds the cell it is applied to. The same logical value re-assigned in another region, template instance, or limb without a copy constraint is a different, unchecked value |
| "It is a standard library gadget" | Library comparators, decompositions, and curve gadgets document preconditions they do not enforce (input widths, binary inputs, subgroup membership). The call site owns them |
| "The contract checks that value anyway" | Only what is inside the public inputs is bound to the proof. A value passed beside the proof, or encoded differently by circuit and verifier, is attacker-chosen |
| "The transcript and commitment scheme are upstream code" | Which public inputs and which verifying-key digest get absorbed is decided by this integration, and Solidity ports and in-circuit verifiers re-implement the upstream logic by hand |

## Core Review Areas

1. Constraint completeness and witness binding, including hints and
   unconstrained helpers
2. Arithmetic encoding: boolean and range constraints, non-native limbs,
   field wraparound, aliasing, zero divisors
3. Gate activation, copy constraints, lookup arguments and multiplicities
4. Public inputs: encoding, order, count, hashing, binding to the statement
5. Verifier logic: equation, verifying-key binding, proof element
   validation, malleability
6. Transcript completeness and ordering as it binds this statement
7. Zero knowledge: blinding and leakage through public outputs
8. Setup, batching, aggregation, and recursion assumptions
9. STARK/AIR protocol layer for generic AIR systems

## Workflow

### Phase 1: Constraint and witness review

- Read `references/zk-checklist.md`
- If the codebase uses circom, halo2, arkworks, or plonky2/3, read the
  corresponding library pattern file in `references/` before proceeding
- If the target is a STARK/AIR system (AIR constraints, execution trace,
  composition polynomial, FRI), read `references/stark-air-patterns.md` and
  execute `workflows/stark-air-review.md`; Cairo/Starknet language and hint
  review routes to `cairo-auditor`, and standalone FRI-as-PCS review routes
  to `commitment-scheme-auditor`
- Map every assigned witness value to its constraining equations
- Flag unconstrained signals, non-native arithmetic width gaps, and lookup
  multiplicity edge cases

### Phase 2: Transcript review

- Read `references/finding-patterns.md`
- Execute `workflows/transcript-review.md`
- Treat any missing absorb, context-binding field, or early challenge as a
  soundness candidate until disproven

### Phase 3: Setup and verifier review

- Execute `workflows/setup-review.md`
- Verify the exact verifier equation, setup provenance, opening-point
  ownership, and recursion threading
- Sweep P1-P14 in `references/finding-patterns.md`; a hit in one template,
  gate, or chip means checking every sibling instance before moving on

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route round-by-round transcript review to `fiat-shamir-auditor`,
  commitment-scheme internals to `commitment-scheme-auditor`, verifier
  contracts to `onchain-verifier-auditor`, point validation to
  `ecc-pairing-auditor`, in-circuit hash parameters to `hash-function-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known
  pattern; contributing an entry happens only after verification
- Recommend `formal-verification-bridge` to the user when an
  under-constraint candidate could be confirmed by a tool

## Output Contract

Produce a circuit-audit handoff listing each candidate with:

- `proof_system_and_framework`
- `affected_component`: the constraints, transcript steps, verifier
  equations, or setup assumptions involved; for STARK/AIR targets the AIR
  constraint group, trace segment, composition/quotient step, or FRI
  parameter at issue
- `witness_or_proof_path`: the exact witness, public-input, or proof path
- `property_at_risk`: soundness, privacy, or batching candidate
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

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
