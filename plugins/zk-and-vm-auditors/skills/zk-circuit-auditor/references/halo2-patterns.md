# Halo2 Library-Specific Finding Patterns

Use when the codebase uses halo2 (PSE, Axiom, or Zcash fork).

## Identify the Fork First

| Fork | Repo | Key difference |
|---|---|---|
| PSE halo2 | privacy-scaling-explorations/halo2 (now privacy-ethereum/halo2, archived) | KZG backend in place of IPA; adds `lookup_any`, `shuffle`, multi-phase challenges |
| Axiom | axiom-crypto/halo2 (fork), with axiom-crypto/halo2-lib (`halo2-base`, `halo2-ecc`) built on it | halo2-lib's simple vertical gate and its `GateChip` / `RangeChip` APIs |
| Zcash halo2 | zcash/halo2 | Original; fewer abstractions, closer to paper |

Misidentifying the fork leads to incorrect API assumptions.

## Copy Constraint Omissions

Cells assigned with `region.assign_advice` are not automatically copy-constrained.
A cell used in two regions must be explicitly equality-constrained with
`region.constrain_equal`. Omission means the prover can assign different values
in different regions without detection.

Look for every pair of regions that share a logical variable and verify
`constrain_equal` is called between the relevant cells.

## Region Assignment Bugs

Gates apply to a fixed set of relative row offsets within a region. A witness
value assigned at the wrong relative offset is gated by a different constraint
than intended. Check that every `assign_advice` call uses the same offset that
the gate configuration references.

## Permutation Argument Edge Cases

The permutation argument covers only columns passed to `enable_equality`, and
only the cell pairs the circuit ties with `constrain_equal` or `copy_advice`.
Rotations belong to gates, not to the permutation argument: the layouter sizes a
region from the offsets the circuit assigns or enables, not from the rotations
its gates query. A gate enabled on a row whose rotation reaches past the
region's assigned rows reads a cell the region did not assign, possibly one in a
neighbouring region. Check that every cell a gate queries at an enabled row is
assigned inside the same region.

## Fork API Divergence

- PSE's `lookup_any` allows dynamic tables (any expressions); Zcash's `lookup`
  takes only fixed `TableColumn`s. A `lookup_any` table built from advice is
  prover-filled: its rows must be tagged by a fixed column or selector and the
  tag included in the lookup, or the argument is unsound (documented on
  `lookup_any` in the PSE source).
- Axiom's halo2-lib provides `RangeChip` and `GateChip`; using raw gate APIs
  instead may miss range constraints these chips enforce.
