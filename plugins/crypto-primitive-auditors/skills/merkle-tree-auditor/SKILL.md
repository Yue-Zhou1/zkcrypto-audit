---
name: merkle-tree-auditor
description: >
  Audit Merkle tree implementations for second-preimage attacks, leaf-node
  domain separation, index and depth binding, sparse and indexed tree edge
  cases, non-membership proofs, multiproofs, append-only frontiers, root
  history handling, and in-circuit versus native hashing drift. Use when
  reviewing inclusion or exclusion proof verifiers, tree update logic,
  prover-supplied sparse witnesses, or Merkle gadgets inside circuits.
allowed-tools: Read Grep Glob Bash
---

# merkle-tree-auditor

Domain auditor for Merkle tree construction, proof verification, and root
update logic in native code, contracts, and circuits.

**Core principle:** a Merkle proof binds exactly what the verifier recomputes
and compares. Anything the verifier takes from the proof without recomputing
it (depth, direction, node type, sibling provenance) is chosen by the prover.

## When to Use

- Reviewing Merkle inclusion/exclusion proof verification code
- Auditing leaf/internal hashing separation and root construction
- Checking sparse Merkle defaults, update semantics, and exclusion proofs
- Reviewing multi-proof batching and path validation logic
- Reviewing append-only trees, root history, or prover-supplied witnesses

## When NOT to Use

- Hash primitive parameter tuning without Merkle tree usage context ->
  `hash-function-auditor`
- Commitment opening systems not based on Merkle authentication paths ->
  `commitment-scheme-auditor`
- Nullifier and note semantics, and which historical roots a protocol should
  accept -> `privacy-protocol-auditor`
- Whether a sparse witness holds every live key a read depends on ->
  `proven-state-transition-auditor`
- Constraint completeness outside the Merkle gadget -> `zk-circuit-auditor`
- Marking suspected Merkle issues as confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The hash is collision resistant, so the tree is binding" | Collision resistance of the compression function says nothing about a leaf preimage parsed as two child digests, a duplicated last node, or a shorter path. Tree binding needs node typing and a fixed shape on top of the hash |
| "Depth is fixed, so leaf/node separation is unnecessary" | True only if every verifier (contract, circuit, light client, multiproof path) enforces that depth and no proof format carries its own length. One variable-length path reopens it |
| "The proof binds the leaf; the index is only a lookup hint" | If direction comes from the proof, from sorted-pair hashing, or from unconstrained selectors, the proof shows the leaf is somewhere in the tree. Anything keyed by position (claim bitmap, account slot, validator index) is then replayable or forgeable |
| "Nobody knows a preimage of the empty leaf" | The empty value is a leaf value, not a digest to invert. If zero or the default is also an encodable leaf, a deleted entry, or a circuit's default witness, membership of "empty" is provable |
| "The witness reproduces the old root, so the state it shows is complete" | It proves membership of what it holds. An omitted live entry rides inside an opaque sibling, and an empty leaf set may never touch the siblings at all |
| "The circuit and the contract use the same hash" | Same name is not same function: parameters, input order, domain tag, reduction of 256-bit values into the field, and the empty-leaf constant differ between libraries. Only a shared test vector closes this |

## Core Review Areas

1. Second-preimage resistance through strict node typing and odd-node rules
2. Leaf-node domain separation and canonical, injective leaf encoding
3. Proof length/path validation and index binding
4. Sparse and indexed tree default values and edge-case handling
5. Non-membership proofs: what binds the queried key to the opened path
6. Prover-supplied sparse witnesses on empty-leaf and insert-only paths
7. Multiproofs: index binding of shared nodes, full input consumption
8. Append-only trees: frontier updates, capacity, zero-hash table
9. Root update safety and state transition checks, root source and history
10. In-circuit versus native hashing consistency

## Workflow

### Phase 1: Tree model and encoding inventory

- Read `references/merkle-checklist.md`
- Identify leaf format, node format, and hash domain tags
- Map index-bit ordering and path-direction handling per verifier

### Phase 2: Proof verification review

- Execute `workflows/proof-review.md`
- Verify path length/depth checks, left-right ordering, and root comparison
- Check sparse defaults and empty-path handling are fail-closed

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize domain-separation gaps, empty-path acceptance, unbound index
  or multiproof reuse, and unvalidated siblings on write paths

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route hash parameter questions to `hash-function-auditor`, nullifier
  and note semantics to `privacy-protocol-auditor`, and witness completeness
  to `proven-state-transition-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

## Output Contract

Produce a Merkle-audit handoff listing each candidate with:

- `tree_variant` (variant, depth, hash, leaf and node encoding)
- `proof_or_update_path` (the verifier or writer and its root source)
- `binding_gap` (the exact node-typing, path-validation, or root-binding gap)
- `impact_class` (`soundness`, `replay_or_update_integrity`, `completeness`)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/merkle-checklist.md](references/merkle-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/proof-review.md](workflows/proof-review.md)
