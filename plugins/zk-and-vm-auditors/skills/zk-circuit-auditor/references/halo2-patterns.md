# Halo2 Library-Specific Finding Patterns

Use when the codebase uses halo2 (PSE, Axiom-CE, or Zcash fork).

## Identify the Fork First

| Fork | Repo | Key difference |
|---|---|---|
| PSE halo2 | privacy-scaling-explorations/halo2 | Adds `lookup_any`, extended permutation |
| Axiom-CE | axiom-eth/halo2-lib | Custom gates, optimized MSM, Axiom-specific APIs |
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

Rotations that cross region boundaries require the layouter to expose cells
across regions. If the layouter floor plan does not account for rotations at
region edges, the permutation argument will not constrain the intended cells.

## Fork API Divergence

- PSE's `lookup_any` allows dynamic tables; Zcash's `lookup` requires fixed tables.
  A circuit ported between forks without adjusting lookup calls may silently
  accept invalid witnesses.
- Axiom-CE adds `RangeChip` and `GateChip`; using raw gate APIs instead may
  miss implicit range constraints these chips enforce.
