# ZK Checklist

Use this checklist when reviewing circuit logic, proof generation, and verifier
code. Bold names are the core checks. Depth on transcripts routes to
`fiat-shamir-auditor`, on commitment schemes to `commitment-scheme-auditor`.

## Constraint completeness and witness binding

- [ ] **Under-constrained signals**: every intermediate witness signal (advice
      cell, private variable, trace column) is fully constrained: no second
      value satisfies the constraints unless that freedom is intended.
- [ ] Every value assigned outside the constraint system (Circom `<--`, hint or
      unconstrained-helper output, advice closure) is re-checked by a constraint
      on that same signal that enforces the full relation.
- [ ] Every bit, flag, and mux condition is constrained boolean; comparator,
      shift, and packing operands are range-constrained to the width assumed.
- [ ] Library gadget preconditions (binary inputs, on-curve or in-subgroup
      points, reduced values) are constrained at the call site, and every
      validity or success output is consumed by a constraint.
- [ ] Gate selectors are fixed by the circuit, or a prover-assigned enable flag
      is bound to constrained data; assignment offsets match the gate's
      rotations, so no consumed cell sits outside every active gate.
- [ ] A logical value used in two places is one variable or tied by a copy
      constraint, never re-assigned from the witness; required constants are
      fixed columns or constant-constrained, not advice.
- [ ] Each lookup constrains the complete tuple (including any table tag) in one
      argument, the table is fixed or itself constrained, and a default row
      added for inactive lookups cannot satisfy an active one.
- [ ] **Lookup table multiplicity overflow**: multiplicity counters are
      range-checked or bounded across the full field, so no sum of them wraps
      the characteristic (small-field LogUp: lookups per table stay below p).
- [ ] **Non-native field arithmetic bit-width**: limb decomposition and range
      checks are complete: every limb and carry is range-checked, no limb
      expression exceeds the native modulus, and results are reduced below the
      foreign modulus wherever equality is relied on.
- [ ] Integer-style arithmetic cannot wrap: the maximum of each sum, product,
      and difference fits below p; decompositions as wide as the field are
      strict (alias-checked), so x and x + p do not both decompose.
- [ ] Division and inverse: the divisor is constrained nonzero or the zero case
      has a defined, constrained result; integer division constrains the
      remainder below the divisor and bounds the quotient.
- [ ] Conditional logic constrains both branches; a factor that switches a
      constraint off (`s * expr = 0`) cannot be set freely by the prover.

## Public input handling

- [ ] **Public input encoding consistency**: circuit and verifier encode public
      inputs identically (byte order, limb split, reduction, packing).
- [ ] The verifier checks the input count against the verifying key, takes
      inputs in circuit order, and rejects values at or above the scalar
      modulus; a short or long vector is never padded or cut.
- [ ] Every value the application relies on (recipient, amount, root, nullifier,
      chain id) is a public input or inside a hashed one; an input no constraint
      uses is confirmed bound by the backend, not assumed.
- [ ] Where public inputs are compressed into a hash, the preimage layout is
      fixed-length or length-prefixed, circuit and verifier hash the same bytes,
      and truncation to fit the field is identical on both sides.

## Verifier logic

- [ ] **Verifier equation correctness**: the pairing check or polynomial
      identity exactly matches the scheme specification: signs, negations,
      pairing sides, no omitted term, no unused proof element.
- [ ] The verifying key is fixed by the deployment or authenticated by digest,
      never accepted from the prover, and reproducible from the audited source.
- [ ] Proof elements are validated on decode (points on curve and in the right
      subgroup, canonical scalars); a parse failure rejects (no zero default).
- [ ] Verified and unverified proofs are distinct types, every caller checks the
      verifier's result, and no mock or debug accept path ships.
- [ ] Replay and uniqueness logic keys on the statement (nullifier, nonce), not
      on proof bytes; Groth16 proofs can be re-randomized by anyone.
- [ ] **Fiat-Shamir transcript completeness**: the challenge is derived from a
      hash of ALL prior prover messages, plus the public inputs and the circuit
      or verifying-key digest; every verifier of the proof (native, on-chain,
      in-circuit) absorbs the same elements in the same order.

## Zero knowledge

- [ ] **Zero-knowledge property**: witness polynomials and analogous secret data
      are properly blinded: blinding values are fresh per proof, come from a
      CSPRNG, and number what the scheme requires for its openings.
- [ ] Each public output derived from private data is reviewed for leakage:
      unsalted hashes of low-entropy values, identifiers that link proofs.

## Batching and aggregation

- [ ] **Batch verification random challenge**: the batching challenge commits to
      all proofs in the batch with their public inputs and verifying keys, and
      is unpredictable once the proofs are fixed (no constant or counter).
- [ ] A failed batch rejects every member or falls back to individual
      verification; an aggregate binds the number and order of inner statements,
      and padding or dummy proofs cannot replace real ones.

## Recursion

- [ ] **Recursion public input threading**: the inner verifier key digest and
      related binding data (inner public inputs, accumulator) are threaded
      through every layer's public inputs to the final verifier.
- [ ] The inner verifying key is a circuit constant, or its digest is checked
      against an allowed set by the final verifier; the prover cannot pick it.
- [ ] Deferred pairing or accumulator checks are performed by the final verifier
      on exactly the values the circuit exposed, same limb encoding.
- [ ] The base case (no previous proof) is selected by constrained public state,
      not a prover-chosen flag; in-circuit verifier challenges are computed by
      constrained hashing, not supplied as witness.

## Setup

- [ ] **KZG trusted setup provenance**: the SRS comes from a verifiable ceremony
      and matches the circuit context (curve, size covers the circuit domain).
- [ ] The setup type is identified: universal SRS (per-circuit preprocessing
      only) or circuit-specific (Groth16 phase 2, redone on any circuit change).
- [ ] Phase-2 contributions verify against the published transcript, and the
      deployed keys are the ceremony output.
- [ ] No production path uses a local or single-party setup (test RNG, fixed
      seed, CI keys); whoever ran it holds the toxic waste and can forge proofs.
- [ ] **KZG opening point soundness**: the verifier controls the evaluation
      point, derived from the transcript after the opened commitments.
