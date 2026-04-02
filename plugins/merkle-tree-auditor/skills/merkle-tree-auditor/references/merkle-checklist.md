# Merkle Tree Audit Checklist

## Second-preimage resistance

- [ ] Leaf encoding cannot be interpreted as internal node encoding
- [ ] Internal node construction is unambiguous for all tree depths
- [ ] Alternate path encodings cannot yield same root

## Leaf-node domain separation

- [ ] Leaf hash uses explicit domain tag different from internal node tag
- [ ] Prefix/tag format is fixed-width and canonical
- [ ] Encoding includes enough structure to avoid type confusion

## Sparse tree

- [ ] Default hash for empty subtree is distinct from any valid leaf hash
- [ ] Empty-branch logic cannot be abused to forge inclusion
- [ ] Sparse update path preserves expected depth invariants

## Proof length validation

- [ ] Proof path length matches configured tree depth
- [ ] Verifier rejects under/over-length proofs
- [ ] Depth assumptions cannot be attacker-selected

## Multi-proof batching

- [ ] Shared intermediates remain bound to index/position metadata
- [ ] Batch verification fails closed when one proof is invalid
- [ ] Reused nodes cannot cross-contaminate unrelated proofs

## Root computation

- [ ] Left/right ordering follows index bits, not attacker-provided order
- [ ] Root comparison uses canonical bytes and exact equality
- [ ] Update flow verifies old root before accepting replacement
