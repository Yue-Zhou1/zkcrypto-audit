# Merkle Proof Review Workflow

Step-by-step review for inclusion/exclusion proof verification safety.

## Phase 1: Parse and normalize inputs

1. Identify proof format: leaf, siblings, index/depth metadata, expected root
2. Verify parser rejects malformed lengths and non-canonical encodings
3. Confirm leaf/index inputs are normalized before hashing

## Phase 2: Recompute path deterministically

1. Reconstruct each level using index-bit left/right ordering
2. Apply explicit leaf/internal domain tags at each hash step
3. Verify computed root is compared exactly to expected root

## Phase 3: Sparse and batch edge cases

1. Validate empty-branch defaults cannot collide with valid leaves
2. Check multiproof shared-node logic remains index-bound
3. Ensure any inconsistency aborts verification immediately

## Phase 4: Cross-reference and handoff

- Compare with `references/finding-patterns.md`
- Check `zkbugs-index` for prior Merkle verification incidents
- Forward surviving findings to `crypto-fp-check`
