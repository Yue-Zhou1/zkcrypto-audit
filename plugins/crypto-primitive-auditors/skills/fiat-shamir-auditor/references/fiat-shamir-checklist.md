# Fiat-Shamir Audit Checklist

## Transcript completeness

- [ ] All prover commitments/messages are absorbed before each challenge
- [ ] Statement context (circuit id, curve id, protocol id) is absorbed
- [ ] Verifier-relevant metadata is bound into transcript state

## Domain separation

- [ ] Distinct rounds/protocols use distinct domain labels
- [ ] Labels are canonical and collision-resistant by construction
- [ ] Reused helper APIs cannot accidentally share transcript domain

## Challenge derivation order

- [ ] Commitments are absorbed before challenge derivation
- [ ] No challenge is derived from partially built transcript state
- [ ] Multi-round challenges depend on all prior round transcripts

## Public input binding

- [ ] Public input values are absorbed before dependent challenges
- [ ] Encoding/canonicalization of public inputs is deterministic
- [ ] Verifier and prover derive identical transcript inputs

## Multi-round consistency

- [ ] Transcript state is not reset between dependent rounds
- [ ] Round transitions preserve prior-binding guarantees

## Hash function choice

- [ ] Challenge derivation uses collision-resistant hash function
- [ ] Challenge width/truncation does not weaken soundness assumptions
