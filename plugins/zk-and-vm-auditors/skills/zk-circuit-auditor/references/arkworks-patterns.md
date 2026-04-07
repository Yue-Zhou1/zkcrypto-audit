# arkworks Library-Specific Finding Patterns

Use when the codebase uses arkworks (ark-r1cs-std, ark-groth16, ark-plonk, etc.).

## Backend Selection Mismatch

arkworks supports multiple backends (Groth16, Marlin/PLONK). Circuit assumptions
differ per backend:
- Groth16 requires linear constraints only (R1CS); non-linear gadgets must be
  decomposed or replaced with lookup-based alternatives
- Marlin/PLONK allows higher-degree constraints; circuits ported from R1CS to
  PLONK may introduce redundant constraints or miss degree-lowering opportunities

Check that the proving system selected at the application level matches the
circuit's constraint model.

## Gadget Composition Bugs

arkworks gadgets implement the `ConstraintSynthesizer` trait. When composing
gadgets, the synthesizer must be called in the correct order and with the correct
input/output variable allocation. Calling a gadget with variables from a different
constraint system produces incorrect constraints without a compile-time error.

Look for gadgets that accept `ConstraintSystemRef` directly and verify each
gadget uses the same `cs` instance throughout composition.

## Proving/Verifying Key Mismatch

arkworks derives the proving key and verifying key from the circuit's constraint
system at setup time. If the circuit changes (even a single constraint) but the
keys are not regenerated, the prover will produce proofs that the verifier rejects —
or, in pathological cases, incorrectly accepts if the constraint removal is not
reflected in the verifying key.

Check that key generation is re-run after any circuit change and that keys are
versioned alongside the circuit code.
