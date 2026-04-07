# plonky2 / plonky3 Library-Specific Finding Patterns

Use when the codebase uses plonky2 or plonky3 for recursive proof construction.

## Gate Type Selection

plonky2 gates are fixed at circuit construction time. Selecting the wrong gate
type for an operation produces incorrect constraints that the prover satisfies
trivially (because the gate does not enforce the intended relation).

Common mistakes:
- Using `ArithmeticGate` when `MulExtensionGate` is needed for extension field ops
- Using `ConstantGate` where a variable is expected — prover can assign anything

## Target Field Selection (plonky2)

plonky2 uses the Goldilocks field (p = 2^64 - 2^32 + 1) by default. Recursive
circuits targeting BN254 (for Ethereum compatibility) must use a different target
configuration. Mismatched field targets produce circuits that are unsound at the
target field size because range checks sized for Goldilocks do not hold in BN254.

Verify that `CircuitConfig` specifies the intended target field and that range
check gates are appropriate for that field.

## FRI Soundness in Custom Gates

plonky2's FRI protocol assumes the constraint degree is bounded. Custom gates that
exceed the configured max constraint degree weaken FRI soundness without a
compile-time error. Check the `max_degree` configuration against the highest-degree
custom gate in the circuit.

## plonky3 Differences

plonky3 restructures the gate and constraint system APIs. Code ported from plonky2
to plonky3 may have:
- Constraint degree limits that changed
- Different row/column layouts for gates
- Air-based constraint formulation that does not directly map to plonky2's gate model
