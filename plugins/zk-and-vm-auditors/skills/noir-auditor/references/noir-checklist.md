# Noir Audit Checklist

Confirm language and stdlib behavior against the pinned compiler version.

## Statement

- [ ] Every value the verifier must fix is a `pub` parameter, a return value
      of the entry point, or bound in-circuit to one; private inputs are
      prover-chosen.
- [ ] Nothing secret is returned from the entry point or copied into a `pub`
      value; public input order matches what the verifier supplies.

## Unconstrained function boundaries

- [ ] Every unconstrained function return is bound by a constrained assertion
      before proof-critical use. The assertion is in the constrained caller:
      an `assert` inside the unconstrained function emits no constraint.
- [ ] Values crossing Brillig into ACIR are validated for range and domain;
      the return type alone is not relied on as a range check unless
      confirmed for the pinned compiler.
- [ ] No unconstrained helper leaks unchecked values into verifier-visible
      outputs (return values, hashes, commitments, nullifiers).
- [ ] The constraints determine the hinted value uniquely: quotient and
      remainder hints are range-checked with remainder < divisor, sort hints
      prove a permutation, search hints prove the index holds the element.
- [ ] No unconstrained output steers a branch or index before it is
      constrained; each `unsafe` block's stated safety argument is backed by
      constraints after the block.

## Oracle safety

- [ ] Oracle outputs are bound by constraints before use in proof logic
      (arithmetic, indexing, commitment generation).
- [ ] Oracle input domain is validated to avoid undefined behavior.
- [ ] Oracle failures cannot silently substitute permissive defaults.
- [ ] Oracle data standing for external state (storage, notes, Merkle paths)
      is checked against a public commitment in constrained code.

## Types, casts, and field arithmetic

- [ ] `Field` arithmetic that models integers is range-bounded: no sum,
      product, or difference can wrap the modulus. Wrapping integer helpers
      appear only where modular semantics are intended.
- [ ] `as` casts are not used as range checks: `Field` to integer and wide to
      narrow casts truncate, so a range assertion precedes any cast where
      truncation changes meaning.
- [ ] Comparisons of `Field`-origin values operate on range-checked integers
      or canonical decompositions; full-width bit or byte decompositions are
      canonical in the pinned stdlib.
- [ ] Every boolean check reaches an `assert`/`assert_eq` (`constrain` in
      legacy code): a discarded comparison result constrains nothing. `==`
      on structs uses an `Eq` impl covering every field the statement needs.

## Array bounds and generic type monomorphization

- [ ] Dynamic indexing in unconstrained functions is checked before
      constrained use.
- [ ] Slice length assumptions are validated at boundary crossing: slices
      and bounded vectors from unconstrained code have their length
      constrained and storage beyond it constrained or excluded from hashing.
- [ ] Generic specialization does not introduce unsound assumptions at
      compile time: every instantiated length or type keeps loop bounds,
      padding, and range assumptions valid.
- [ ] Monomorphized code paths preserve constraint coverage, including each
      selected trait impl and `comptime`-generated code in expanded form.

## Black-box functions and standard library

- [ ] Signature verification results are asserted; the message hash is
      computed in-circuit or bound to a public input.
- [ ] Recursive proof verification pins the verification-key hash to a
      constant or public input and binds the inner public inputs.
- [ ] Variable-length hash calls bind the length argument; documented stdlib
      preconditions (point validity, scalar limb ranges) are met.

## Brillig vs ACIR

- [ ] No semantic divergence between the Brillig optimized path and ACIR
      constraints for functions compiled for both runtimes.
- [ ] Arithmetic semantics (wrapping/failure) are consistent across backends:
      overflow, division by zero, and out-of-bounds indexing fail in both.
- [ ] Backend-specific optimization does not bypass required checks.

## Witness generation

- [ ] Prover witness generation matches constraint system expectations: an
      honest witness always satisfies, no valid input is unprovable.
- [ ] Witness helper functions cannot encode values that violate application
      invariants: each invariant is a constraint, not helper behavior.
- [ ] Witness serialization/deserialization preserves canonical forms:
      inputs and verifier public inputs reject field values >= the modulus.
