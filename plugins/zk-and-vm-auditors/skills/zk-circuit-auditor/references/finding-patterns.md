# Finding Patterns

Actively hunt these ZK-specific failure modes. P1-P5 are verifier and
transcript patterns, P6-P11 are constraint-system patterns, P12-P14 concern
the statement, recursion, and setup. Framework-specific forms are in the
per-library pattern files; STARK/AIR forms are A1-A8 in
`references/stark-air-patterns.md`.

## P1: Verifier missing context-binding field

- **Pattern:** the statement or transcript the verifier checks omits a field
  that identifies where the proof is valid: session, instance, chain,
  contract, circuit, or verifying-key digest.
- **Impact:** cross-session, cross-instance, or cross-domain replay of an
  otherwise valid proof.

## P2: Transcript absorb order mismatch

- **Pattern:** prover and verifier, or two verifiers of the same proof
  (native, on-chain, in-circuit), absorb messages in a different order or
  encoding.
- **Impact:** the two sides derive different semantics from the same
  transcript state. Honest proofs fail, or a verifier variant binds less
  than the reference verifier does.

## P3: Challenge derived too early (frozen heart)

- **Pattern:** a challenge is squeezed before the final message it must
  depend on is absorbed. The same class covers batching and aggregation
  challenges derived before every proof and public input in the batch is
  fixed.
- **Impact:** the "frozen heart" class of bug: the prover can adapt a prior
  message after seeing the challenge and forge proofs.

```rust
// BUG: commitment message omitted from transcript before challenge
fn bad_prove(x: Scalar, r: Scalar) -> (G1, Scalar) {
    let r_commitment = r * G;
    let c = hash(G, x * G);
    (r_commitment, r + c * x)
}

// FIX: ALL prior prover messages must be absorbed before challenge generation
fn good_prove(x: Scalar, r: Scalar) -> (G1, Scalar) {
    let r_commitment = r * G;
    let c = hash(G, x * G, r_commitment);
    (r_commitment, r + c * x)
}
```

Treat every transcript omission as a possible **frozen heart** issue until you
prove the omitted value is already bound elsewhere. Full transcript analysis
routes to `fiat-shamir-auditor`.

## P4: Default or zero values after parse failure

- **Pattern:** decoding a commitment, point, or field element fails and the
  code continues with a default (identity point, zero scalar, empty vector)
  instead of rejecting.
- **Impact:** invalid proof elements collapse into accepted defaults; a
  verification equation evaluated on identity or zero terms can hold
  trivially.

## P5: Unverified and verified objects sharing one type

- **Pattern:** the same type represents a proof, key, or public input before
  and after validation, and safe-looking APIs accept either.
- **Impact:** callers pass unchecked values through paths that assume the
  checks already ran.

## P6: Assigned but unconstrained witness

- **Pattern:** a value is computed in witness generation (Circom `<--`, a
  hint, an advice assignment) and no constraint re-checks the relation on
  that signal, or the constraint covers only part of it.
- **Impact:** the prover substitutes any value. The honest witness generator
  is irrelevant: an attacker writes their own.

## P7: Gadget precondition not established at the call site

- **Pattern:** a comparator, range, hash, or curve gadget assumes bounded,
  binary, or on-curve inputs and documents it; the caller passes a private
  witness without the range or validity constraint, or ignores the gadget's
  validity output.
- **Impact:** the gadget's result is meaningless on out-of-range inputs:
  comparisons flip, signature or membership sub-circuits become optional.

## P8: Prover-controlled gate activation

- **Pattern:** a selector, `enabled` flag, or multiplexer condition that
  turns a check on is itself a free witness: an advice-column selector, an
  unconstrained boolean, a flag derived only from private data.
- **Impact:** the prover turns the check off for the rows or branches where
  it would fail.

## P9: Field wraparound in integer-style or non-native arithmetic

- **Pattern:** logic assumes integer semantics but an intermediate sum,
  product, or difference can exceed the native modulus; limbs or carries of
  a non-native value lack range checks; a result is not reduced below the
  foreign modulus.
- **Impact:** a relation that is false over the integers holds modulo p, so
  balances, comparisons, or foreign-field equations can be forged.

## P10: Non-unique witness: aliasing and zero divisors

- **Pattern:** the constraints admit more than one value where the design
  assumes one: a full-width bit decomposition without an alias check
  (x and x + p), `q * b === a` with b = 0 leaving q free, an inverse hint with
  no zero case, an unbounded quotient in a modular reduction, a square root
  with no rule for which root.
- **Impact:** the prover picks the representation that suits them: a second
  nullifier for one note, a chosen quotient, a different branch.

## P11: Lookup argument gaps

- **Pattern:** a lookup covers only some columns of the relation, the table
  is prover-assigned without being constrained, a default row added for
  inactive lookups also satisfies active ones, or multiplicities can wrap
  the field characteristic.
- **Impact:** tuples outside the intended relation pass the lookup; range
  checks and opcode or state tables stop constraining anything.

## P12: Unbound or unused public input

- **Pattern:** a value the application trusts (recipient, fee, root) travels
  next to the proof but is not a public input; or it is public but circuit
  and verifier encode it differently (order, truncation, hash layout); or it
  is public, used by no constraint, and the backend in use does not bind
  unused inputs (bellman, ark-groth16, and snarkjs Groth16 setups add an
  input-consistency constraint per public input, which binds it; confirm
  for any other backend or hand-written setup).
- **Impact:** the proof verifies for a statement other than the one the
  application acts on; a front-runner swaps the unbound field.

## P13: Inner verifying key or deferred check not bound

- **Pattern:** a recursive or aggregating circuit takes the inner verifying
  key as a witness and never exposes or pins its digest, or it defers the
  pairing or accumulator check to the final verifier, which does not perform
  it on the exposed values.
- **Impact:** the outer proof attests to "some circuit accepted", including
  one the prover wrote, or to an accumulator nobody checked.

## P14: Stale or development keys in the verifier

- **Pattern:** the deployed verifying key came from a local or single-party
  setup, or from a circuit version other than the audited one (keys not
  regenerated after a constraint fix).
- **Impact:** whoever ran the setup can forge proofs; a stale key verifies
  the pre-fix circuit, so the fixed bug is still exploitable.
