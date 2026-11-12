---
name: vdf-auditor
description: >
  Audit verifiable delay function implementations: Wesolowski and Pietrzak
  verification, hash-to-prime and challenge derivation, group choice (RSA
  modulus provenance, class groups, low-order elements), delay-parameter
  handling, proof batching, and consumer-side use of VDF outputs (beacon
  bias, withholding). Use when reviewing VDF setup, evaluators, provers,
  verifiers, or beacons and consensus code that consume VDF outputs.
allowed-tools: Read Grep Glob Bash
---

# vdf-auditor

Domain auditor for verifiable delay functions and sequential-proof
verification in groups of unknown order, from setup to the consumer.

**Core principle:** soundness (the output is correct) comes from the
verifier; sequentiality (nobody had it early) comes from the group setup and
the delay parameter. A valid proof says nothing about the second.

## When to Use

- Auditing VDF setup, proving, and verification code paths
- Reviewing Wesolowski or Pietrzak challenge and proof validation logic
- Checking delay-parameter and repeated-squaring assumptions
- Verifying modulus/group setup provenance and trusted assumptions
- Reviewing batch or segmented proof verification
- Reviewing how a beacon, lottery, or consensus rule consumes VDF output

## When NOT to Use

- VRF proofs, keys, and outputs -> `vrf-auditor`
- Transcript encoding and domain-separation detail beyond the VDF challenge
  inputs -> `fiat-shamir-auditor`
- Generic signature or encryption audits with no sequentiality property ->
  `signature-scheme-auditor` or `encryption-scheme-auditor`
- Entropy for modulus generation or beacon seeds -> `randomness-auditor`
- Big-integer overflow, panics, and unsafe code -> `rust-crypto-safety`
- Marking a suspected VDF issue as confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The proof verifies, so this is the VDF output" | In a group with a known low-order element, such as -1 in (Z/N)*, multiplying the output by it, and likewise the Wesolowski proof computed for the new challenge, gives a second accepted output. Uniqueness needs a group without such elements and canonical encodings |
| "The modulus is a 2048-bit RSA number, that is standard" | Size is not the property. Whoever knows the factorisation reduces the exponent modulo the group order and gets the output at once, with a proof no verifier can tell apart |
| "The prover sends the challenge prime to save verifier work" | The verifier must still check it is prime and that it is the hash of the group, input, output, and delay. A challenge not bound to the output lets the prover pick the proof first and solve for an output |
| "T arrives with the proof, and the proof is sound for that T" | Soundness is relative to T. The delay exists only if T is fixed by the protocol with a minimum, never chosen by the prover |
| "That fast path is only a performance optimisation" | Checkpoints, trusted-peer skips, cached outputs, and trapdoor evaluators each change who did sequential work or what the verifier checked. Each needs its own soundness review |
| "The output is unique, so withholding cannot bias anything" | True only when the encoding is canonical, there is no fallback value for a late output, and the delay outlasts the window in which the input can still be influenced |

## Core Review Areas

1. Delay parameter selection and sequentiality assumptions
2. Challenge prime derivation and transcript completeness; hash-to-prime
3. Repeated-squaring and verifier exponent correctness
4. Trusted-modulus/group setup integrity and trapdoor assumptions
5. Group element validation, canonical encoding, and low-order elements
6. Proof batching rules and shortcut-path soundness
7. Consumer-side use: verify-before-use, bias windows, withholding, fallback

## Workflow

### Phase 1: Setup-to-verifier mapping

- Read `references/vdf-checklist.md`; pin the construction, group, and
  governing paper using `references/spec-sources.md`
- Map setup, proof generation, and verifier code boundaries

### Phase 2: Challenge and proof verification

- Execute `workflows/challenge-review.md`: challenge derivation includes
  complete transcript context, verifier exponent and relation checks match
  the target construction, and no shortcut path bypasses the delay parameter

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize malformed proof acceptance, transcript truncation, modulus
  trust gaps, low-order malleability, and prover-chosen delay

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route transcript construction to `fiat-shamir-auditor`, VRF-based
  beacon inputs to `vrf-auditor`, setup entropy to `randomness-auditor`,
  and construction-paper deltas to `spec-delta-checker`

## Output Contract

Produce a VDF handoff listing each candidate with:

- `construction_and_group` (and the verifier or setup routine involved)
- `challenge_inputs` (what the challenge binds in the affected path)
- `invariant_at_risk` (the soundness or sequentiality property that fails)
- `issue_class` (parameter, verifier, modulus/setup, batching, consumer)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/vdf-checklist.md](references/vdf-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/challenge-review.md](workflows/challenge-review.md)
