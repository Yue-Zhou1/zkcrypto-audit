# gnark Audit Checklist

Confirm API behavior against the gnark version pinned in `go.mod`.

## Statement and visibility

- [ ] Public witness declarations are minimal and match protocol commitments:
      nothing public that must stay private, nothing secret the verifier fixes.
- [ ] No secret input is promoted to public by a struct tag, a tag on an
      enclosing struct or wrapper, or a default; each `frontend.Variable`
      field has an explicit `gnark:",public"` or `gnark:",secret"` tag.
- [ ] Public witness ordering and naming are stable across the prover and
      verifier boundary, including any exported verifier's input array.
- [ ] Every public input is tied to the secret witness by a constraint; no
      public field is overwritten in `Define` instead of asserted equal.
- [ ] Values the verifier supplies per proof are public variables, not Go
      fields or constants fixed at compile time.

## Frontend intent vs compiled constraints

- [ ] Every `frontend.API` assertion the design relies on has a corresponding
      backend constraint after compile; no relation is Go-side only.
- [ ] No security-critical branch exists in frontend logic without backend
      enforcement: Go `if`/`for` run at compile time, not per witness.
- [ ] Backend-only optimizations (constant folding, builder-specific
      handling) do not alter the intended frontend semantics.
- [ ] Slice and array lengths at compile and setup equal those at proving.

## Constraint API preconditions and hints

- [ ] Constraint API misuse is checked around `AssertIsEqual`, selectors, and
      implicit range assumptions: every range the logic assumes is enforced,
      and integer-modelled arithmetic cannot wrap the scalar field.
- [ ] `api.Div` and `api.Inverse` are used where a zero divisor must fail the
      proof; `api.DivUnchecked` only where 0/0 is unreachable.
- [ ] `api.Cmp` and `api.AssertIsLessOrEqual` operands are range-checked
      first: they compare integers in [0, r), so "negative" values are large.
- [ ] `api.ToBinary` bit counts equal the proven range of the value;
      full-width decompositions are canonical in the pinned version
      (CVE-2023-44378 affected gnark before 0.9.0).
- [ ] Selectors and boolean operands, including hand-rolled selections, are
      boolean-constrained by the API or explicitly.
- [ ] Custom gate or selector usage cannot disable required constraints:
      deselected-branch values are bounded or cannot reach an output.
- [ ] Hint outputs are constrained before affecting proof-critical logic:
      constraints determine each output uniquely from constrained values.
- [ ] Division, modular-reduction, and root hints: quotient and remainder are
      range-checked, remainder < divisor, and the reconstruction cannot wrap;
      outputs used as bits, selectors, or indices are asserted in range.
- [ ] Hint functions return errors, never default outputs.

## Emulated arithmetic and std gadgets

- [ ] The emulated field is the one the protocol means (base vs scalar field
      of the foreign curve).
- [ ] Emulated elements from the witness, hints, or hand-built limbs are
      limb-width-constrained; equality uses the field's modular assertion,
      not unreduced limbs; bits or bytes are taken from the canonical form,
      so value + k*q is not a second accepted encoding.
- [ ] Each std gadget's documented preconditions are discharged by the
      caller: pre-range-checked inputs, on-curve and subgroup points, bounded
      differences for bounded comparators, lookup table and index domains,
      a bound leaf index for Merkle gadgets, the intended message form for
      signature gadgets, a reset between uses of a shared hasher object.
- [ ] In-circuit proof verification uses an inner verifying key that is a
      constant or bound to a public input, never a free witness.

## Backend, setup, and curve

- [ ] Groth16 proof bytes are not used as a unique identifier or replay
      guard; anyone can re-randomize a valid proof.
- [ ] Circuits using the Groth16 commitment extension run on a gnark version
      with the v0.11.0 advisory fixes; direct uses of a commitment-derived
      challenge commit to every value the randomized check depends on.
- [ ] No production key comes from an in-process `groth16.Setup`, a dummy
      setup, or a test-only SRS; ceremony output matches the deployed key.
- [ ] Curve and field choices are explicit and match protocol assumptions
      and the claimed security level; no value is parsed under one modulus
      and constrained under another; setup, proving, and verifying use the
      same curve and field parameters, companion curves, and hash constants.

## Witness assignment and serialization

- [ ] Witness construction, proving, and verification errors are propagated;
      no nil or partial witness reaches the prover; any non-nil `Verify`
      error is a rejection; the verifier builds the public witness from its
      own protocol state.
- [ ] Witness serialization includes explicit versioning and format checks;
      decode errors are handled without permissive fallback defaults.
- [ ] Parsed witness data preserves canonical field representation: external
      integers >= r are rejected, not reduced, where the protocol treats the
      integer and the field element as one identifier.
