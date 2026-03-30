# Transcript Review

Review transcript code in strict sequence.

## Phase 1: Enumerate messages

- List ALL prior prover messages that should influence the challenge
- Confirm the transcript commits to witness-dependent commitments, public inputs, and protocol context before challenge derivation

## Phase 2: Check ordering and domain separation

- Verify prover and verifier absorb messages in the same order
- Check domain separation tags, protocol labels, and recursion-layer labels
- Reject shared transcript labels across protocol variants unless intentionally versioned

## Phase 3: Check context binding

- Verify public input encoding is identical between circuit and verifier
- Check that session identifiers, circuit identifiers, verifier key digests, and batching context are bound where required
- Look for challenges derived before the final required absorb

## Failure Rules

- Missing absorbs or context fields are soundness candidates
- Divergent ordering is a verifier/prover mismatch until disproven
- If the challenge can be influenced after derivation, treat it as a critical-path bug
