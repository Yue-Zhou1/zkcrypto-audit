# Transcript Review

Circuit-side transcript binding review, in strict sequence. It covers what
depends on this circuit and its verifiers: whether the statement (public
inputs, circuit or verifying-key digest, recursion layer) is bound into the
challenges, and whether all verifiers of the proof agree. The generic
transcript audit (absorb inventory for every challenge, per-round domain
separation, reset and fork safety, challenge width, hash suitability) is
owned by `fiat-shamir-auditor`.

1. **Build the timeline.**
   `grep -rniE "transcript|absorb|squeeze|challenge|fiat|keccak256\(abi"`
   across prover, native verifier, on-chain verifier, and in-circuit
   verifier. For each, list in execution order ALL prior prover messages
   absorbed (witness-dependent commitments, public inputs, protocol context)
   and where each challenge is squeezed. Flag any challenge with no
   witness-dependent commitment before it. A system with no transcript
   (Groth16) binds public inputs in the pairing equation: record that and go
   to `workflows/setup-review.md`.

2. **Decide who reviews the rounds.** An unmodified upstream transcript used
   through its standard prove and verify entry points: record the pinned
   version and do steps 3-6. Hand-written, forked, ported (Solidity,
   in-circuit), or extended with custom rounds: queue `fiat-shamir-auditor`
   with the timeline, and still do steps 3-6.

3. **Public input binding.** Every public input is absorbed before the first
   challenge, and its encoding is identical between circuit and verifier
   (order, count, limb split, reduction). Try to construct two statements
   that absorb the same bytes: unprefixed variable-length lists, truncated
   hashes, a caller-supplied digest absorbed in place of the inputs.

4. **Circuit and key binding.** The circuit identifier or verifying-key
   digest (covering domain size, input count, fixed commitments) is absorbed
   before the first challenge. If the key is a verifier constant, a missing
   digest is an observation. If the key is an input (recursion, universal
   verifier, key registry), the prover can choose it after seeing
   challenges: soundness candidate.

5. **Labels and context.** List domain separation tags, protocol labels, and
   recursion-layer labels; reject labels shared across protocol variants,
   circuit versions, or layers unless intentionally versioned. Check that
   session identifiers, chain or contract identifiers, and batching context
   are bound where required, as public inputs or absorbs. An in-circuit
   verifier must recompute challenges by constrained hashing, not take them
   as witness.

6. **Verifier symmetry and timing.** Soundness is judged on the verifier's
   transcript; the prover's shows only completeness. Diff the absorb
   sequence of every verifier of the same proof element by element (order,
   encoding, challenge count), then prover against the reference verifier.
   For each binding in steps 3-5, look for a dependent challenge derived
   before the final required absorb.

7. **Hand off.** Fill the output contract per candidate; attach the timeline
   and name the challenge, the missing or late element, and the verifier
   variant affected.

## Failure Rules

- Missing absorbs or context fields are soundness candidates until the value
  is shown to be bound elsewhere
- Divergent ordering is a verifier/prover mismatch until disproven; a
  verifier variant that absorbs less than the reference is a candidate
- If the challenge can be influenced after derivation, treat it as a
  critical-path bug
- A hand-written or modified transcript is never closed from this workflow
  alone: set `next_route` to `fiat-shamir-auditor`
