# Setup Review

Review verifier and setup assumptions before concluding a proof system is safe.

## Phase 1: Verifier equation

- Confirm the implemented verifier equation matches the scheme specification exactly
- Check sign conventions, negations, pairing sides, and omitted terms

## Phase 2: Setup provenance

- Verify **KZG trusted setup provenance** or the equivalent PCS trust model
- Check that the setup is not reused across incompatible circuits, public input layouts, or domains

## Phase 3: Opening and batching controls

- Verify **KZG opening point soundness** by confirming the verifier controls the evaluation point
- Check **Batch verification random challenge** derivation and ensure it commits to all proofs and contexts in the batch
- Review lookup and multiplicity logic for range or overflow edge cases

## Phase 4: Recursion and binding

- Verify recursion public inputs thread the inner verifier key digest and other required binding values
- Check that proof aggregation preserves the same statement and setup assumptions end to end
