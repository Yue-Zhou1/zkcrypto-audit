# arkworks Library-Specific Finding Patterns

Use when the codebase uses arkworks (ark-r1cs-std, ark-groth16, ark-marlin, etc.).

## Backend Selection Mismatch

arkworks supports multiple backends (Groth16, Marlin, PLONK-style crates built
on it). Circuit assumptions differ per constraint model:
- Groth16 and Marlin consume R1CS: each constraint is rank-1 (a product of two
  linear combinations equal to a third), so higher-degree gadgets must be
  decomposed into intermediate variables, each with its own constraint
- PLONK-style backends allow custom higher-degree gates; circuits ported from
  R1CS to PLONK may introduce redundant constraints, miss degree-lowering
  opportunities, or drop a range or boolean constraint the R1CS gadget carried

Check that the proving system selected at the application level matches the
circuit's constraint model.

## Gadget Composition Bugs

arkworks circuits implement the `ConstraintSynthesizer` trait
(`generate_constraints`); gadgets are variable types allocated into a constraint
system through `AllocVar`. When composing gadgets, each variable must be
allocated in the intended mode (constant, input, witness) and in the same
constraint system. Calling a gadget with variables from a different constraint
system produces incorrect constraints without a compile-time error.

Look for gadgets that accept `ConstraintSystemRef` directly and verify each
gadget uses the same `cs` instance throughout composition.

## Proving/Verifying Key Mismatch

arkworks derives the proving key and verifying key from the circuit's constraint
system at setup time (`Groth16::circuit_specific_setup`,
`generate_random_parameters_with_reduction`). The keys bind the circuit they
were generated from, not the current source. If the circuit changes (even a
single constraint) but the keys are not regenerated, proofs made from the new
circuit normally fail to verify. The soundness risk is the reverse: a verifying
key left over from an earlier circuit still accepts proofs made with that
circuit's proving key, so a constraint added as a fix is not enforced until the
verifier's key is replaced. A Groth16 setup is circuit-specific, so new keys
also mean a new setup.

Check that key generation is re-run after any circuit change, that the deployed
verifying key is the one generated for the audited circuit, and that keys are
versioned alongside the circuit code.
