# noir-auditor Finding Patterns

## P1: Unconstrained function return trusted without assertion

- **Pattern:** the return value of an unconstrained helper enters constrained
  logic directly, or its only check is an `assert` inside the helper.
- **Impact:** the prover supplies any value; everything derived from it is
  attacker-chosen.

## P2: Hint checked by a relation that does not determine it

- **Pattern:** a hinted quotient, remainder, root, index, or sorted array is
  checked by an equation over `Field` without range, ordering, or
  permutation constraints.
- **Impact:** a second solution modulo the field satisfies the check; range
  proofs, comparisons, and lookups built on the hint are forgeable.

## P3: Oracle result used in constrained context without binding

- **Pattern:** external data from an oracle influences the proof path
  without an explicit constraint tying it to a public commitment.
- **Impact:** the prover's host returns fabricated state.

## P4: Field wraparound or truncating cast

- **Pattern:** integer logic done on `Field` values, or a `Field`/wide
  integer narrowed with `as` and no preceding range assertion.
- **Impact:** balances and bounds wrap or lose high bits while the proof
  still verifies.

## P5: Statement value not public

- **Pattern:** a root, nullifier, recipient, or amount the verifier relies on
  is a private parameter with no in-circuit link to a `pub` value.
- **Impact:** the proof says nothing about that value.

## P6: Black-box result discarded or key unpinned

- **Pattern:** a signature verification result is not asserted, the message
  hash is a free input, or a recursive verification's key hash is a witness.
- **Impact:** invalid signatures pass; a proof for an arbitrary circuit is
  accepted as the inner proof.

## P7: Array slice from unconstrained function used as fixed-size

- **Pattern:** unchecked length assumptions cross the trust boundary: a
  slice or bounded vector from Brillig is used in constrained context with
  its length or its storage beyond the length unconstrained.
- **Impact:** hidden trailing data changes hashes or equality; logical length
  is prover-chosen.

## P8: Brillig optimization changes arithmetic semantics

- **Pattern:** the optimized Brillig path wraps or truncates where ACIR
  expects failure or bounds checks, for a function used in both runtimes.
- **Impact:** witness generation and constraints disagree: honest proofs
  fail, or a hint silently carries a wrapped value into constrained code.

## P9: Witness value satisfies constraints but violates application invariant

- **Pattern:** the invariant (ordering, uniqueness, non-zero, membership) is
  upheld by the witness helper, not by a constraint.
- **Impact:** the proof system accepts a value that breaks a protocol rule.

## P10: Generic or comptime instantiation drops a check

- **Pattern:** a check holds for one array length or type and not for
  another instantiation; generated code omits an assertion the handwritten
  version had.
- **Impact:** constraint coverage differs per instantiation.
