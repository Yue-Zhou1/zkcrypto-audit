---
name: folding-scheme-auditor
description: >
  Audit folding scheme and IVC implementations for accumulator soundness, step
  circuit binding, cycle-of-curves correctness, and running instance
  completeness: relaxed R1CS/CCS folding equations, what the folding challenge
  binds, cross-term commitments, base case handling, non-native field
  encoding, and what the final compressing SNARK verifies. Use when reviewing
  Nova, SuperNova, HyperNova, ProtoStar/ProtoGalaxy, Sangria-style, or custom
  folding-based proof systems in Rust.
allowed-tools: Read Grep Glob Bash
---

# folding-scheme-auditor

Domain auditor for folding scheme and incrementally verifiable computation
(IVC) systems: the fold itself, the augmented step circuit that verifies a
fold in-circuit, and the decider that closes the chain.

**Core principle:** soundness is a chain of three links. The challenge binds
everything folded, the step circuit binds each step to its predecessor, and
the decider checks every instance left open at the end.

## When to Use

- Reviewing Nova, SuperNova, HyperNova, ProtoStar, ProtoGalaxy, or
  Sonobe-based Rust implementations
- Auditing accumulator update logic and relaxed R1CS/CCS folding equations
- Checking IVC step circuit binding and public input threading across steps
- Reviewing cycle-of-curves field selection and cross-curve consistency
- Auditing running instance completeness and error term construction
- Reviewing the final SNARK (decider) over the last accumulator

## When NOT to Use

- Standard Groth16, PLONK, or STARKs without folding -> `zk-circuit-auditor`
- Recursive plonky2/3 circuits -> `zk-circuit-auditor`
- Constraint review of the step function itself -> `zk-circuit-auditor`
- Transcript and challenge-derivation depth -> `fiat-shamir-auditor`
- Commitment binding and key generation -> `commitment-scheme-auditor`
- zkVM built on folding (memory, continuations) -> `zkvm-auditor`
- Declaring accumulator bugs confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "Every step circuit is satisfied, so the chain is valid" | A satisfied step shows a relation for some inputs. Without the in-circuit hash check tying its public input to (i, z0, z_i, running instance), steps are not chained |
| "The challenge is a hash output, so it is random" | It is random only relative to what was absorbed before it. A cross-term commitment or instance field absorbed late, or not at all, lets the prover solve for it after seeing r |
| "The final SNARK verifies, so the IVC is sound" | The decider proves only what its statement contains. If it omits the last fresh instance, the state hash, the step count, or the second curve's instances, those are unverified |
| "The base case is only initialization" | It is the one branch that skips the predecessor check. Reachable with i != 0, or without forcing z_i = z0 and the default instance, it lets the prover start from any state |
| "Both fields are about 255 bits, so the value fits" | The two fields of a cycle differ. Values in the gap alias after reduction, so hashes and challenges that cross must be truncated or range-checked to a common width |
| "Folding with a random challenge hides the witness" | The challenge is public and the folded witness is a known linear combination. Zero-knowledge needs hiding commitments plus a ZK decider or a folded random instance |

## Core Review Areas

1. Accumulator soundness: relaxed R1CS folding equation correctness, error
   term construction and range
2. IVC step circuit binding: public input threading across steps, base case
3. Cycle-of-curves consistency: field element compatibility, cross-curve
   public input encoding, non-native arithmetic
4. Running instance completeness: witness availability per step, error
   accumulation bounds
5. Folding verifier equation: cross-term commitments, challenge derivation,
   final SNARK proof
6. Variants: HyperNova multi-folding, ProtoStar-style error terms, SuperNova
   program-counter selection, zero-knowledge of the folded proof

## Workflow

### Phase 1: Checklist pass

- Read `references/folding-scheme-checklist.md`
- Identify the folding scheme variant (Nova, HyperNova, ProtoStar) and the
  cycle of curves; map all accumulator update sites and IVC step boundaries

### Phase 2: Accumulator review

- Execute `workflows/accumulator-review.md`: verify the relaxed R1CS equation,
  error term, and cross-term commitment at every folding step
- Treat any unchecked accumulator field as a soundness candidate until
  disproven

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`; prioritize IVC step binding gaps,
  cycle-of-curves field mismatches, and base case soundness failures
- Check the final SNARK proof over the last accumulator for correct key binding

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route challenge derivation to `fiat-shamir-auditor`, commitments to
  `commitment-scheme-auditor`, step-function constraints to
  `zk-circuit-auditor`, in-circuit curve arithmetic to `ecc-pairing-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

## Output Contract

Produce a folding-scheme handoff listing each candidate with:

- `scheme_and_cycle`: folding scheme, constraint system, curve cycle
- `accumulator_component`: accumulator state, step circuit, or verifier
  equation involved
- `binding_gap`: exact folding equation gap, field mismatch, or binding failure
- `issue_class`: `accumulator_soundness`, `ivc_threading`,
  `curve_consistency`, or `verifier_equation`
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/folding-scheme-checklist.md](references/folding-scheme-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/accumulator-review.md](workflows/accumulator-review.md)
