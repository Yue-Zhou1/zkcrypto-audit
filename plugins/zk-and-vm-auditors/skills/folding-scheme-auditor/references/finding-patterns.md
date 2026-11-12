# folding-scheme-auditor Finding Patterns

## P1: Missing IVC step binding

- **Pattern:** the step circuit does not verify that its public input equals
  the hash of the running accumulator from the previous step, or the hash
  omits i, z0, z_i, or part of the instance.
- **Impact:** the prover jumps to any intermediate state and still produces
  a valid-looking proof.

## P2: Cross-term commitment omission

- **Pattern:** the cross-term T is computed but not absorbed into the
  transcript before the challenge is derived, or is zero or hardcoded.
- **Impact:** the prover chooses T after seeing the challenge, breaking the
  binding argument of the fold.

## P3: Challenge does not bind the full instances

- **Pattern:** the challenge omits the parameter digest, an instance's
  public IO or u, or one of the commitments.
- **Impact:** the omitted field is chosen after the challenge; instances
  from a different circuit or parameter set can be mixed in.

## P4: Cycle-of-curves field mismatch

- **Pattern:** a public input crossing curves is not range-checked; a value
  that fits curve A's scalar field overflows curve B's.
- **Impact:** undetected reduction: two distinct hashes or states alias.

## P5: Non-native representation error

- **Pattern:** limbs of a non-native element unchecked, a reduction hint
  unconstrained, or the challenge truncated differently in and out of circuit.
- **Impact:** the in-circuit fold computes a different instance than the
  native verifier checks.

## P6: Base case not validated

- **Pattern:** the verifier or circuit accepts a prover-supplied initial
  instance, or the base-case branch is reachable at i != 0.
- **Impact:** a non-trivial initial instance satisfies the folding relation
  without satisfying the step function.

## P7: Error term mishandled across folds

- **Pattern:** E is truncated, assumed zero or small, or carried in limbs
  that grow unreduced until they overflow the field.
- **Impact:** late-step proofs use an E the relation does not account for;
  the final SNARK accepts an invalid computation.

## P8: Final verifier under-checks the instance pair

- **Pattern:** the IVC verifier checks the running instance but not the last
  fresh instance, or binds only one curve's instances to the state hash.
- **Impact:** forged final instances pass. Nguyen, Boneh, and Setty (2023)
  report a break of this class in the original two-curve Nova code.

## P9: Decider key or statement mismatch

- **Pattern:** the final SNARK's verifier key is not tied to the step circuit,
  its public inputs omit the accumulator hash, or it is only deserialized.
- **Impact:** any accumulator value is accepted.

## P10: HyperNova LCCCS/CCCS confusion

- **Pattern:** code conflates the two committed instance types or applies
  the wrong folding relation to one of them; sum-check claims unchecked.
- **Impact:** multi-folding soundness breaks.

## P11: Folded proof assumed zero-knowledge

- **Pattern:** an uncompressed IVC proof or folded witness is published
  under a privacy claim; commitments use zero or reused blinding.
- **Impact:** linear combinations of the witness leak to the verifier.
