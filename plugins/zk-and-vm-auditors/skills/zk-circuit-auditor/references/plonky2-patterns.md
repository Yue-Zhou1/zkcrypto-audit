# plonky2 / plonky3 Library-Specific Finding Patterns

Use when the codebase uses plonky2 or plonky3 for recursive proof construction.

## Gate Type Selection

plonky2 gates are fixed at circuit construction time. Selecting the wrong gate
type for an operation produces incorrect constraints that the prover satisfies
trivially (because the gate does not enforce the intended relation).

Common mistakes:
- Using `ArithmeticGate` when `MulExtensionGate` is needed for extension field ops
- Filling a target from a witness generator (`add_simple_generator`, or a
  virtual target from `add_virtual_target`) with no gate enforcing the relation
  the generator computes — generators only assign values, so the prover can
  assign anything

## Target Field Selection (plonky2)

plonky2 circuits are defined over a 64-bit prime field (`RichField`), in practice
Goldilocks (p = 2^64 - 2^32 + 1). A proof destined for Ethereum is not re-targeted
to BN254: it is verified inside a separate BN254 SNARK that emulates Goldilocks
arithmetic in the larger field. In that wrapper an emulated element that is not
range-checked is an arbitrary BN254 scalar, so relations that hold modulo the
Goldilocks prime can be forged.

The field is fixed by the circuit's generic parameters (`F` and the
`GenericConfig` that selects the hasher), not by `CircuitConfig`. Verify that the
final recursion layer uses the configuration the wrapping verifier expects and
that range check gates are appropriate for that field: a wrapper that emulates
Goldilocks elements in a larger field must range-check each one to its canonical
range.

## FRI Soundness in Custom Gates

plonky2's quotient computation assumes the constraint degree is bounded by the
circuit configuration. Check the configured quotient degree bound
(`max_quotient_degree_factor` in `CircuitConfig`) against the highest-degree
custom gate in the circuit. `CircuitBuilder::build` panics ("has too high
degree") when a gate's declared `degree()` does not fit under that bound, but it
trusts the value the gate reports. For a custom gate, confirm `degree()` is not
lower than the true degree of its constraints (the crate's `test_low_degree`
helper checks this).

## plonky3 Differences

plonky3 restructures the gate and constraint system APIs. Code ported from plonky2
to plonky3 may have:
- Constraint degree limits that changed
- Different row/column layouts for gates
- Air-based constraint formulation that does not directly map to plonky2's gate model
