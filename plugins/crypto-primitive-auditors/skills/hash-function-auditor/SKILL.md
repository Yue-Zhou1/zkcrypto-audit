---
name: hash-function-auditor
description: >
  Audit ZK-friendly hash functions (Poseidon/Poseidon2, Rescue, MiMC,
  Pedersen hash, Anemoi, Griffin) for parameter selection (rounds, S-box vs
  field, MDS and round-constant generation), sponge construction (capacity,
  rate, padding, length and domain encoding), multi-arity use, truncation,
  algebraic attack resistance, and in-circuit vs native equivalence. Use
  when reviewing a hash permutation, its constants, a sponge or compression
  wrapper, or its call sites.
allowed-tools: Read Grep Glob Bash
---

# hash-function-auditor

Domain auditor for ZK-friendly hash primitive security and usage
correctness.

**Core principle:** a hash name is not a parameter set. A security claim
attaches to one exact instance (field, width, rate, S-box, rounds,
constants, matrix) used in one analysed mode.

## When to Use

- Auditing Poseidon, Poseidon2, Rescue, MiMC, Pedersen hash, or related ZK
  hash implementations (Anemoi, Griffin)
- Checking round count, S-box, and matrix choices against claimed margins
- Reviewing sponge absorption/squeezing APIs, parameterization, and padding
- Verifying domain separation tags across hash call sites
- Reviewing variable-length, multi-arity, compression-mode, or truncated use
- Comparing an in-circuit hash gadget with its native implementation

## When NOT to Use

- Transcript review not focused on hash internals -> `fiat-shamir-auditor`
- Merkle node typing and path verification -> `merkle-tree-auditor`
- Commitment openings, or Pedersen used as a blinded commitment ->
  `commitment-scheme-auditor`
- Constraint completeness of a hash gadget -> `zk-circuit-auditor`
- Nullifier and PRF derivation rules -> `privacy-protocol-auditor`
- Keccak or SHA-2 in Ethereum encodings -> `ethereum-crypto-auditor`
- Confirming a suspected hash finding -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "It is Poseidon from a widely used library, so the parameters are standard" | There is no single Poseidon. Libraries differ in width, round numbers, constants, and output cell, and Poseidon2 is a different permutation. Copies also get re-encoded or reused for another width or field. Regenerate and compare |
| "Inputs are fixed length, so no padding or domain tag is needed" | True only if every call site of that instance uses the same length and role. One width shared by 2-to-1 compression, leaf hashing, and nullifiers with the same IV collides across roles |
| "Zero-padding the last block is harmless" | [a] and [a, 0] then hash to the same value. Length must be in the IV or the padding must be injective |
| "The round numbers include a security margin" | The margin was computed for one (field, width, S-box) under the attacks known then. Later algebraic cryptanalysis has cut into the margins of some published instances, and changing any element of the tuple voids the analysis |
| "The circuit gadget implements the same algorithm" | That is a claim to test. Optimised partial rounds, separate constant tables, and input-range assumptions diverge, and a gadget that accepts non-canonical inputs yields digests the native code never produces |
| "Pedersen hash is collision resistant, so it works as a general hash" | Only for fixed-length input under independent generators. It is not a random oracle or PRF: outputs have algebraic structure |

## Core Review Areas

1. Parameter selection and provenance
2. Algebraic attack resistance for chosen rounds and constants
3. Matrix and S-box structural properties
4. Sponge construction and capacity/rate safety; padding and length encoding
5. Compression mode, multi-arity use, output length and truncation
6. Domain separation and call-site context binding
7. Input encoding into field elements
8. In-circuit vs native implementation equivalence

## Workflow

### Phase 1: Parameter provenance review

- Read `references/hash-checklist.md`
- Verify round constants and MDS matrices are derived with clear provenance
- Confirm claimed security level matches round configuration

### Phase 2: Sponge and API review

- Execute `workflows/sponge-review.md`
- Validate absorption/squeezing behavior, padding, and capacity boundaries
- Review call sites for unsafe reuse across protocol domains

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize weak constants, missing domain separation, and capacity misuse

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route Merkle node typing to `merkle-tree-auditor`, transcript use to
  `fiat-shamir-auditor`, gadget constraint gaps to `zk-circuit-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known
  pattern; contributing an entry happens only after verification

## Output Contract

Produce a hash handoff listing each candidate with:

- `primitive_instance` (primitive, parameter set, and call sites)
- `property_gap` (capacity, rounds, separation, algebraic margin, encoding)
- `exploit_conditions` (what the attacker must control, expected impact)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/hash-checklist.md](references/hash-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/sponge-review.md](workflows/sponge-review.md)
