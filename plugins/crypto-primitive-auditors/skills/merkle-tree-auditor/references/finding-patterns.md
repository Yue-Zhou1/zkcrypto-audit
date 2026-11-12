# merkle-tree-auditor Finding Patterns

## P1: Leaf and internal node hash without domain separation

- **Pattern:** leaf and node hashes are one function over inputs that can
  coincide (64-byte or two-field leaf), and path length is not fixed.
- **Impact:** leaf-as-node confusion enables second-preimage style forgery.

## P2: Duplicated last node on odd levels

- **Pattern:** an odd-width level is completed by hashing the last node with
  itself, so the list with that node repeated has the same root.
- **Impact:** two leaf lists share a root. In CVE-2012-2459 (Bitcoin) an
  invalid mutated block kept a valid block's hash and wedged nodes it reached.

## P3: Proof verification accepts empty path

- **Pattern:** path length comes from the proof, and a zero-length or short
  path is accepted, so the leaf is compared directly to the root.
- **Impact:** verifier may accept an arbitrary value as a valid root, or the
  root and internal nodes as members.

## P4: Index not bound to the path

- **Pattern:** direction bits are separate from the index the application
  uses, pairs are sorted before hashing, the index is not range-checked, or
  circuit selectors are not constrained boolean.
- **Impact:** a real leaf verifies at a position it does not occupy (double
  claim); unconstrained selectors let the prover forge membership outright.

## P5: Sparse tree default value collides with valid leaf hash

- **Pattern:** the empty-leaf or empty-subtree value is one a real leaf can
  take: zero, a value with a known opening, or the encoding of a deletion.
- **Impact:** empty branches can impersonate real membership.

## P6: Non-membership proof with unbound key or neighbour

- **Pattern:** the exclusion proof opens a path not derived from the queried
  key, or a low leaf whose ordering check is missing or wraps in the field.
- **Impact:** absence is proven for a present key: nullifier reuse,
  duplicate insertion, bypassed revocation.

## P7: Multi-proof batch shares intermediate nodes without index binding

- **Pattern:** the verifier walks a hash queue steered by prover flags
  without binding shared nodes to positions or consuming every element.
- **Impact:** invalid paths can be smuggled through shared state.

## P8: Root update does not verify old root before replacement

- **Pattern:** an update writes a new root without recomputing the old root
  from the same siblings, or root lookup matches an unset history slot.
- **Impact:** attacker rewrites state root without authenticated prior state.

## P9: Empty-leaf witness bypass

- **Pattern:** root recompute short-circuits to the stored root when no
  leaves are read, so an insert-only update builds the new root from
  unvalidated siblings.
- **Impact:** forges the whole tree in one transition.

## P10: Witness iteration mistaken for completeness

- **Pattern:** code iterates a sparse witness as the live set; it proves
  membership of what it holds, not absence of what it omits.
- **Impact:** an omitted live entry rides inside an opaque sibling. Route to
  `proven-state-transition-auditor`.

## P11: In-circuit and native hashing diverge

- **Pattern:** circuit and native tree differ in hash parameters, input
  order, tag, empty-leaf constant, bit order, or reduction of wide values.
- **Impact:** honest proofs fail, or values that reduce to one field
  element alias and the two sides accept different leaves.
