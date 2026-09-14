# Sparse Witness Review

A sparse witness proves that the entries it contains are in the old root. It
cannot, by itself, prove that it contains every entry. This workflow finds
every place the guest relies on the second property while only having the
first.

## Phase 1: Map the witness

1. Identify the witnessed state type and how the guest rebuilds the old root
   from it (leaf map plus sibling hashes, per tree).
2. Identify every read API over that state and classify each:
   - single-key read (`get(key)`)
   - aggregate read (`iter()`, `all()`, `len()`, `entries()`)
   - existence check (`contains(key)`, `is_empty()`)
3. Identify every write path and how the new root is computed from the
   updated leaf plus the supplied siblings.

## Phase 2: Single-key reads

For each single-key read on a security-relevant path, answer:

- If the key is live in the old root but omitted from the witness, does the
  read return `None` / default, or does it fail?
- If it returns a default, list every caller that treats "absent" as a
  meaningful state (no override, no cap, no config, zero balance).

A read that silently defaults on an omitted key is a candidate regardless of
how callers use it today.

## Phase 3: Aggregate reads

For each aggregate read, answer:

- Can the prover omit a live entry while still reproducing the old root
  (the omitted leaf rides inside an opaque sibling hash)?
- Does the aggregate feed a value-affecting decision: an accrual, a
  denominator, a cap, a solvency check, a fee, a set of markets to update?
- Is every entry the decision depends on forced through a fail-closed
  single-key read in the same batch? "Every user of the entry will read it"
  is only valid if such a user is guaranteed to be in the batch.
- If the omitted update is deferred rather than skipped, is the deferred
  update computed identically? Catch-up logic that prices the whole gap at
  the catch-up batch's inputs is a different transition.

Close an aggregate row only with a two-witness argument: write down the
witness with the entry and the witness without it, show both reproduce the
old root, and show the new roots are equal. If they can differ, build the
PoC.

## Phase 4: Insert-only and empty-leaf paths

- Find every transition that writes a key without first reading any key in
  the same tree.
- On that path, are the supplied siblings validated against the old root at
  all? A root-recompute that returns the stored root when the leaf set is
  empty validates nothing, and the new root is then built from unvalidated
  siblings.
- Check the empty-subtree sentinel: can a populated subtree be replaced by
  the sentinel, or the sentinel by a fabricated hash, without a check?
- Check that path depth, key-to-position mapping, and sibling count are
  fixed by the tree type, not by the witness.

## Phase 5: Handoff

For each read path record: the API, the caller, the malformed-witness class
(omitted key, omitted aggregate entry, insert-only, sentinel substitution),
the two-witness argument or PoC, and the disposition. Route to
`merkle-tree-auditor` for hash-construction concerns found on the way, and
to `crypto-fp-check` for candidates.
