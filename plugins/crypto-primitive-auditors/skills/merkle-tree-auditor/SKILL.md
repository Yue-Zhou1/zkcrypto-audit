---
name: merkle-tree-auditor
description: >
  Audit Merkle tree implementations for second-preimage attacks, leaf-node
  domain separation, sparse tree edge cases, and proof verification soundness.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# merkle-tree-auditor

Domain auditor for Merkle tree construction and proof verification logic.

## When to Use

- Reviewing Merkle inclusion/exclusion proof verification code
- Auditing leaf/internal hashing separation and root construction
- Checking sparse Merkle defaults and update semantics
- Reviewing multi-proof batching and path validation logic

## When NOT to Use

- Hash primitive parameter tuning without Merkle tree usage context
- Commitment opening systems not based on Merkle authentication paths
- Marking suspected Merkle issues as confirmed without verification gates

## Core Review Areas

1. Second-preimage resistance through strict node typing
2. Leaf-node domain separation and canonical encoding
3. Sparse tree default values and edge-case handling
4. Proof length/path validation and index binding
5. Root update safety and state transition checks

## Workflow

### Phase 1: Tree model and encoding inventory

- Read `references/merkle-checklist.md`
- Identify leaf format, node format, and hash domain tags
- Map index-bit ordering and path-direction handling

### Phase 2: Proof verification review

- Execute `workflows/proof-review.md`
- Verify path length/depth checks, left-right ordering, and root comparison
- Check sparse defaults and empty-path handling are fail-closed

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize domain-separation gaps, empty-path acceptance, and unbound multiproof reuse

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce a Merkle-audit handoff that includes:

- The tree variant and proof path under review
- The exact node-typing, path-validation, or root-binding gap
- Whether the issue affects soundness, replay/update integrity, or completeness
- The next verification or reporting route

## Reference Index

- [references/merkle-checklist.md](references/merkle-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/proof-review.md](workflows/proof-review.md)
