# Merkle Proof Review Workflow

Executable review for inclusion, exclusion, and update proof verification.

1. **Pin the tree model.** Record variant, depth (constant or stored),
   hash, leaf and node preimage layout, tags, empty value, and index-bit
   order for every builder and verifier. Start from
   `grep -rniE "merkle|verify_?proof|sibling|path_?ind|zero_?hash|root"`.

2. **Enumerate verifiers and root sources.** For each function that
   recomputes a root, identify the proof format (leaf, siblings, index or
   depth metadata) and where the expected root comes from: storage, a
   public input checked against storage, or the caller. A root that arrives
   with the proof is a candidate. Confirm the parser rejects malformed
   lengths and non-canonical encodings and normalizes leaf and index.

3. **Attempt the node-typing forgery.** Take an internal node `N = H(l, r)`
   and ask what stops the verifier accepting the preimage of `N` as a leaf
   with a path one level shorter. The answer must be a distinct tag, an
   enforced leaf length, or an enforced depth; if depth alone, repeat for
   every verifier from step 2 (P1). Then check whether a three-leaf list and the
   same list with its last leaf repeated share a root (P2).

4. **Attempt the index swap.** Keep leaf and siblings, change only the
   claimed index, and trace whether verification still passes. Try
   `index + 2^depth`. In circuits, find the constraint that makes each
   selector boolean; a selector that is only assigned is P4.

5. **Probe length.** Trace a zero-length path, depth minus one, and depth
   plus one through each verifier (P3). Any inconsistency must abort
   verification immediately, not fall through to a default.

6. **Attack exclusion and batch proofs.** For each non-membership proof,
   name what binds the queried key to the opened path, then try to prove
   absence of a present key: open another path, use a non-adjacent low
   leaf, wrap the comparison (P6). Check that empty-branch defaults cannot
   collide with valid leaves (P5). For multiproofs, trace surplus elements
   and duplicate leaves, and confirm shared nodes stay index-bound (P7).

7. **Trace sibling provenance on writes.** For every path that computes a
   new root, mark each sibling as checked against the old root or not. Take
   the empty-leaf-set and insert-only cases separately (P9), and confirm
   old and new root share one sibling path (P8). Reads that aggregate over
   a prover-supplied witness go to `proven-state-transition-auditor` (P10).

8. **Check append-only state and consistency.** Recompute the zero-hash
   table. Walk an insertion at index 0, at the last index, and one past it.
   Look up an unset history slot and another tree's root. Run or locate a
   test that feeds identical leaves to the native and circuit trees and
   compares roots (P11); without one, record consistency as `unverified`.

9. **Hand off.** Compare candidates with `references/finding-patterns.md`,
   query `zkbugs-index` for prior Merkle verification incidents, fill the
   Output Contract fields, and forward survivors to `crypto-fp-check`.

## Failure rules

- Never close node typing by citing the hash's collision resistance.
- A verifier is not reviewed until its root source has a file:line.
- A write path is not closed until each sibling's old-root binding is shown.
- Witness completeness is never closed here; it is routed.
