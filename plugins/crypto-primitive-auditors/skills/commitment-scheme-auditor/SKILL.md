---
name: commitment-scheme-auditor
description: >
  Audit polynomial and vector commitment schemes: KZG (SRS provenance and
  validation, degree bounds, opening and batch-opening equations,
  evaluation-point ownership), FRI as a PCS (rate, query count, folding
  consistency, grinding, soundness-bits accounting), IPA/Bulletproofs
  openings, and Pedersen commitments (generator independence, binding vs
  hiding). Use when reviewing commitment, opening, or setup-loading code, or
  when a PCS question is routed from a circuit or verifier review.
allowed-tools: Read Grep Glob Bash
---

# commitment-scheme-auditor

Domain auditor for polynomial-commitment and vector-commitment soundness
and setup assumptions. Single owner of PCS review across the framework.

## When to Use

- Reviewing KZG, FRI, IPA, or Pedersen commitment implementations
- Auditing degree bound checks and evaluation proof verification logic
- Checking trusted setup provenance, SRS loading, and SRS validation
- Reviewing batch opening and random-combination security assumptions
- Recomputing FRI soundness bits from rate, queries, grinding, field size
- A PCS question was routed here from `zk-circuit-auditor`

## When NOT to Use

- Derivation and ordering of the challenges themselves, or transcript
  concerns with no commitment operation on the path -> `fiat-shamir-auditor`
- Hash parameter audits without verifier context -> `hash-function-auditor`
- Merkle authentication paths -> `merkle-tree-auditor`
- Point, subgroup, and pairing checks -> `ecc-pairing-auditor`
- EIP-4844 application usage -> `ethereum-crypto-auditor`
- Circuit constraints, AIR, circuit-specific setup -> `zk-circuit-auditor`
- Accumulation of deferred openings -> `folding-scheme-auditor`
- Confirming a suspected commitment issue -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The SRS is from a well-known ceremony" | The bytes loaded at runtime are what matters. Without a pinned hash or structural validation, a swapped, truncated, or test-generated SRS with known tau is accepted the same way |
| "KZG is binding, so the degree is bounded" | Only by the SRS length. A protocol that needs degree below that, or an SRS larger than the circuit domain, gives the prover the extra degrees unless a bound is checked |
| "The pairing check passed, so the opening is valid" | It proves f(z) = y for whatever C, z, y went into the equation. If the prover knew z before fixing C, or C is not the commitment bound to the statement, it proves nothing useful |
| "Random linear combination is standard batching" | Only when the coefficient is derived after every commitment, value, and proof it combines, and is fresh per batch. Otherwise the prover solves for errors that cancel |
| "N queries at blowup B is N*log2(B) bits" | That figure assumes the up-to-capacity conjectures, disproved as stated in 2025; it is a ceiling, not an estimate. Proven bounds give about half (Johnson) or under one bit per query (unique decoding), and field size, hash output, and where grinding applies cap the total |
| "The generators are random-looking points from the library" | Binding needs that nobody knows a relation between them. Generators computed as known multiples of a base point, including from a seeded scalar RNG, carry a trapdoor; they must come from hash-to-curve on a public seed |

## Core Review Areas

1. Trusted setup and parameter provenance integrity
2. Degree bound enforcement on committed polynomials
3. Evaluation proof verification at correct points and values, and who
   chooses the evaluation point
4. Batch opening randomness and binding
5. FRI: rate, query schedule, folding consistency, final polynomial,
   grinding, soundness-bits accounting
6. IPA: round count, generator independence, final check
7. Pedersen: generator independence, binding vs hiding, blinding
8. Malformed and mixed-scheme proof objects; fail-closed batch verification

## Workflow

### Phase 1: Scheme and parameter inventory

- Read `references/commitment-checklist.md`
- Identify commitment scheme(s), parameter sets, and verifier pathways
- Mark any dynamic or external parameter loading points

### Phase 2: Opening verification review

- Execute `workflows/kzg-review.md` (KZG, and IPA/Pedersen via its step 8)
- Verify opening equations, evaluation point ownership, transcript binding
- Check degree bounds are enforced before accepting commitment/opening tuples
- If FRI is on the path, execute `workflows/fri-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize missing degree checks, premature challenge derivation, and
  untrusted setup loads

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route challenge derivation to `fiat-shamir-auditor`, Merkle paths to
  `merkle-tree-auditor`, point and subgroup checks to `ecc-pairing-auditor`,
  EIP-4844 usage to `ethereum-crypto-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known
  pattern; contributing an entry happens only after verification

## Output Contract

Produce a commitment handoff listing each candidate with:

- `scheme_variant` (KZG/FRI/IPA/Pedersen, parameter set, proof path)
- `integrity_gap` (the exact bound, opening, or setup integrity gap)
- `affected_property` (soundness, completeness, hiding, configuration trust)
- `soundness_accounting` (FRI only: regime and recomputed bits)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/commitment-checklist.md](references/commitment-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/kzg-review.md](workflows/kzg-review.md)
- [workflows/fri-review.md](workflows/fri-review.md)
