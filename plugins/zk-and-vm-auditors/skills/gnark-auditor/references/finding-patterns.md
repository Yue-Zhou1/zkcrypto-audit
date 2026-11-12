# gnark-auditor Finding Patterns

## P1: Frontend value accepted but backend constraint omitted

- **Pattern:** a value is computed in `Define` (or a public field is
  overwritten with the result) and never reaches an `Assert*`.
- **Impact:** the prover picks the value; a public output proves nothing.

## P2: Hint output unconstrained or only partly constrained

- **Pattern:** a `NewHint` output is used directly, or checked by a relation
  without range checks (q*b + r == a with no bound on q and r).
- **Impact:** the prover substitutes another output that satisfies the
  relation modulo r; arithmetic and comparisons built on it are forgeable.

## P3: Secret value promoted to public, or statement value left secret

- **Pattern:** a tag on a field, wrapper, or enclosing struct makes a private
  input public; or a value the verifier must fix is secret or baked in.
- **Impact:** witness exposure; or the prover chooses a value the protocol
  believed was pinned.

## P4: Non-canonical decomposition or full-width comparison

- **Pattern:** `api.ToBinary` at field width without a canonical check, or
  `api.Cmp`/`AssertIsLessOrEqual` on values that were never range-checked.
- **Impact:** a and a + r decompose differently, so range and ordering checks
  pass for wrapped values (CVE-2023-44378 in gnark before 0.9.0).

## P5: Zero divisor or non-boolean selector

- **Pattern:** `api.DivUnchecked` reachable with 0/0, or a hand-rolled
  selection (`b*x + (1-b)*y`) whose selector is never constrained boolean.
- **Impact:** the quotient wire is unconstrained, or the selection yields a
  prover-chosen blend of both branches.

## P6: Selector path bypasses validation

- **Pattern:** selector-controlled constraints leave values in the disabled
  branch unbounded, and those values still influence an output.
- **Impact:** the prover routes an invalid value through the disabled branch.

## P7: Emulated element used unreduced

- **Pattern:** limbs from a hint or hand-built element are not width-checked,
  or bits are taken from a representation only reduced modulo limb overflow.
- **Impact:** value + k*q is accepted as a second encoding; foreign-field
  equality, hashes of the element, and scalar decompositions diverge.

## P8: Gadget precondition not discharged

- **Pattern:** a std gadget is called outside its documented domain: bounded
  comparator with unbounded inputs, point gadget with unchecked points,
  Merkle gadget with a free leaf index, inner verifying key as free witness.
- **Impact:** the gadget's guarantee does not hold for the inputs it got.

## P9: Field element parsed in one modulus and constrained in another

- **Pattern:** decoding and constraint systems use inconsistent field
  assumptions (base vs scalar field, another curve), or external integers
  >= r are reduced silently on assignment.
- **Impact:** two external values map to one in-circuit value; nullifier or
  identifier aliasing at the application layer.

## P10: Nil or error ignored during witness assignment or verification

- **Pattern:** the witness builder drops assignment errors and continues with
  partially initialized values, or a `Verify` error is logged, not returned.
- **Impact:** proofs over unintended witnesses, or rejected proofs accepted.

## P11: Development setup in production

- **Pattern:** keys from an in-process `groth16.Setup`, a dummy setup, or a
  test-only KZG SRS are deployed; or the circuit changed after the ceremony.
- **Impact:** the party who ran setup can forge proofs for any statement.
