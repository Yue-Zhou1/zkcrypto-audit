# Finding Patterns

Common finding patterns for folding scheme and IVC implementations.

## High-Priority Patterns

### Missing IVC Step Binding
If the step circuit does not verify that its public input matches the hash of the
running accumulator from the previous step, a prover can jump to any intermediate
state and produce a valid-looking proof. This was a root cause in early Nova
implementations.

### Cross-Term Commitment Omission
The Fiat-Shamir challenge must commit to the cross-term T. If T is computed but
not absorbed into the transcript before the challenge is derived, a prover can
choose T adaptively after seeing the challenge, breaking the binding argument.

### Cycle-of-Curves Field Mismatch
Public inputs that cross curve boundaries must be range-checked. A value that fits
in curve A's scalar field may overflow curve B's scalar field, producing field
arithmetic errors that are undetected without an explicit range check.

## Medium-Priority Patterns

### Base Case Not Validated
If the IVC verifier does not validate the base case separately, an attacker can
provide a non-trivial initial instance that satisfies the folding relation without
satisfying the step function. The verifier must check the initial case explicitly.

### Error Term Accumulation Overflow
In repeated folding, the error term E grows with each step. If the range of E is
not checked at each step, late-round proofs may use E values that overflow the
field, producing incorrect but accepting verifiers.

### HyperNova LCCCS/CCCS Confusion
HyperNova uses two committed instance types (LCCCS and CCCS). Code that conflates
the two or applies the wrong folding relation to each breaks multi-folding soundness.
