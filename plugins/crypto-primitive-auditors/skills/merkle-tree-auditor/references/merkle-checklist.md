# Merkle Tree Audit Checklist

## Second-preimage resistance and leaf-node domain separation

- [ ] Leaf encoding cannot be interpreted as internal node encoding
- [ ] Internal node construction is unambiguous for all tree depths
- [ ] Alternate path encodings cannot yield same root
- [ ] Leaf hash uses explicit domain tag different from internal node tag
- [ ] Prefix/tag format is fixed-width and canonical
- [ ] Encoding includes enough structure to avoid type confusion: it is
      injective, with variable-length fields length-prefixed or fixed-width
- [ ] Where separation relies on leaf length or double hashing instead of a
      tag, the verifier enforces it for every leaf it accepts
- [ ] Odd-width levels are not completed by duplicating the last node, and
      padding cannot make two leaf lists share a root (CVE-2012-2459 class)

## Path, index, and length validation

- [ ] Proof path length matches configured tree depth
- [ ] Verifier rejects under/over-length proofs, including a zero-length
      path that compares the leaf directly to the root
- [ ] Depth assumptions cannot be attacker-selected; variable-depth trees
      bind depth through node typing or a committed leaf count
- [ ] Left/right ordering follows index bits, not attacker-provided order
- [ ] The index is range-checked below 2^depth and is the same value the
      application acts on (claim bitmap, account slot, validator index)
- [ ] Sorted-pair (commutative) hashing is used only where position carries
      no meaning
- [ ] In circuits, every path selector is constrained boolean and the
      left/right swap is constrained, not only assigned

## Sparse tree and non-membership

- [ ] Default hash for empty subtree is distinct from any valid leaf hash
- [ ] Empty-branch logic cannot be abused to forge inclusion
- [ ] Sparse update path preserves expected depth invariants
- [ ] The key-to-path mapping is a fixed function of the full key
- [ ] A deleted or zero-valued entry and a never-written slot are the same
      state everywhere or are encoded differently everywhere
- [ ] A non-membership proof opens the path the verifier derives from the
      queried key; a compact-tree terminal leaf carries its full key, which
      is checked to differ from the query
- [ ] Indexed or sorted trees: the low leaf is proven under the same root,
      and `low.value < key` and (`key < low.next_value` or the end-of-list
      sentinel) are enforced with range-constrained comparisons

## Sparse witness supplied by the prover

- [ ] Root recompute validates supplied siblings even when the leaf set is
      empty; it never returns the stored root untouched
- [ ] Insert-only transitions (write without a prior read in the same tree)
      rebuild the path from siblings that were checked against the old root
- [ ] Every supplied sibling is bound to the old root before it is used to
      compute the new root
- [ ] The empty-subtree sentinel cannot stand in for a populated subtree,
      and a fabricated hash cannot stand in for the sentinel
- [ ] Iterating the witness is never used as proof that every live key is
      present (route completeness questions to
      `proven-state-transition-auditor`)

## Multi-proof batching

- [ ] Shared intermediates remain bound to index/position metadata
- [ ] Batch verification fails closed when one proof is invalid
- [ ] Reused nodes cannot cross-contaminate unrelated proofs
- [ ] Every leaf, proof element, and flag is consumed, counts are checked
      against each other, and duplicate leaves follow a defined rule

## Root computation and append-only state

- [ ] Root comparison uses canonical bytes and exact equality
- [ ] Update flow verifies old root before accepting replacement, and old
      and new root share one sibling path
- [ ] The root a proof is checked against comes from trusted state or a
      public input bound to it, never from the message carrying the proof
- [ ] Root history lookup never matches an uninitialised slot or another
      tree's root, and evicted roots are rejected
- [ ] The next-leaf index is checked against capacity before insertion; a
      full tree rejects instead of wrapping or overwriting
- [ ] The zero-hash table is recomputed from the empty leaf, and the
      frontier stores a node only where it is a left child at that level

## In-circuit versus native consistency

- [ ] Builder, verifier, and circuit agree on hash parameters, input order,
      tags, empty leaf, depth, index-bit order, and reduction of values
      wider than the field, shown by a shared test vector
- [ ] The circuit root is a public input or constrained equal to one, and
      no enable flag can skip the root check for a value-bearing input
