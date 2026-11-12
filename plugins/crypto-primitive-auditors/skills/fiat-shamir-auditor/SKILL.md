---
name: fiat-shamir-auditor
description: >
  Audit Fiat-Shamir transcripts: absorb/squeeze ordering, completeness
  (weak vs strong Fiat-Shamir, Frozen Heart class), public input binding,
  domain separation, challenge derivation and field reduction, fork and
  reset, prover/verifier symmetry, batching challenges, and grinding. Use
  when reviewing transcript or challenge code in SNARK/STARK verifiers,
  sigma protocols, Bulletproofs/IPA, sumcheck/GKR, or signatures.
allowed-tools: Read Grep Glob Bash
---

# fiat-shamir-auditor

Domain auditor for transcript binding and challenge derivation, and the
single owner of generic transcript review across the framework.

**Core principle:** a challenge binds only what was absorbed before it. Any
value the prover can still choose after a challenge is derived is chosen with
knowledge of that challenge.

## When to Use

- Reviewing Fiat-Shamir transforms in proof systems (PLONKish, STARK/FRI,
  sumcheck/GKR, Bulletproofs/IPA), sigma protocols, and signature schemes
- Auditing absorb order, challenge timing, and multi-round dependencies
- Checking statement, public input, and domain separation binding to
  transcript state (weak vs strong Fiat-Shamir)
- Reviewing challenge derivation (width, field reduction and bias), fork
  and reset, prover/verifier and native/in-circuit transcript symmetry
- Reviewing batched-opening challenges, query-index sampling, grinding,
  and transcript questions routed from `zk-circuit-auditor`

## When NOT to Use

- Circuit constraints, which values a circuit exposes as public inputs,
  verifying-key digest contents, recursion threading -> `zk-circuit-auditor`
- Hash primitive internals (rounds, constants, capacity) when transcript
  behavior is not under review -> `hash-function-auditor`
- Opening equations, SRS, FRI accounting -> `commitment-scheme-auditor`
- Signature rules beyond the challenge hash -> `signature-scheme-auditor`
- Prover nonce and blinding generation -> `randomness-auditor`
- Confirming a suspected transcript flaw -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The statement is public, the verifier already has it, so it need not be hashed" | That is weak Fiat-Shamir. The prover picks the statement after seeing the challenge and solves for one that verifies. Known is not bound |
| "We use a transcript library, so ordering and separation are handled" | A library frames what it is given. It cannot absorb a value the caller never passes, and the labels and call order are the caller's |
| "Prover and verifier compute the same challenges, so the transcript is right" | Agreement is completeness. A transcript that omits a message agrees perfectly on both sides and is unsound |
| "The interactive protocol has negligible soundness error" | The non-interactive prover retries each round offline. A multi-round protocol needs more than plain soundness (round-by-round, state-restoration, or special soundness); sequential repetition of a constant-error round does not survive the transform |
| "The challenge is a field element, so it is large enough" | Over a 31- or 64-bit field one base-field challenge gives at most that many bits. A truncated challenge caps soundness at its width |
| "Grinding adds N bits, so we can drop queries elsewhere" | Proof-of-work only raises the cost of re-sampling challenges derived after the nonce. It does nothing for earlier rounds, and nothing at all if the verifier does not check it |

## Core Review Areas

1. Transcript completeness for all prover and context messages
2. Public input and statement binding to challenges (strong Fiat-Shamir)
3. Domain separation across protocol rounds and contexts; injective framing
4. Challenge derivation order and dependency correctness
5. Hash primitive suitability, challenge width, field reduction and bias
6. Multi-round transcript consistency, fork and reset safety
7. Prover/verifier and native/in-circuit transcript symmetry
8. Batching challenges, query-index sampling, and grinding nonces

## Workflow

### Phase 1: Transcript inventory

- Read `references/fiat-shamir-checklist.md`
- Identify all absorb/squeeze operations and transcript states
- Enumerate every statement element expected to influence challenges

### Phase 2: Binding review

- Execute `workflows/transcript-binding-review.md`
- Verify commitments are absorbed before challenge derivation
- Ensure public inputs and domain labels are bound at the correct points

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize Frozen Heart style independence, missing absorbs, reset bugs

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route circuit-level binding to `zk-circuit-auditor`, hash
  parameters to `hash-function-auditor`, opening equations and FRI
  accounting to `commitment-scheme-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known
  pattern; contributing an entry happens only after verification

## Output Contract

Produce a transcript handoff listing each candidate with:

- `challenge_point` (transcript state, label, round, and challenge)
- `binding_gap` (the missing binding, absorb-order, or reset-safety issue)
- `affected_property` (soundness, replay resistance, context separation)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/fiat-shamir-checklist.md](references/fiat-shamir-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/transcript-binding-review.md](workflows/transcript-binding-review.md)
