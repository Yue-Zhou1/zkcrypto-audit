# Commitment Scheme Audit Checklist

## Degree bound

- [ ] Commitment path enforces maximum polynomial degree
- [ ] Verifier checks claimed degree bound against setup/domain parameters
- [ ] Degree metadata cannot be attacker-controlled without validation

## Evaluation proof

- [ ] Opening verified at correct evaluation point and value
- [ ] Proof equation uses canonical commitment and point encodings
- [ ] Verifier rejects malformed or mixed-scheme proof objects

## Trusted setup

- [ ] SRS provenance is documented and integrity-checked
- [ ] Curve/group parameters match expected scheme requirements
- [ ] No unchecked fallback to local/untrusted setup artifacts

## Batch opening

- [ ] Random linear-combination challenge is fresh and transcript-bound
- [ ] Challenge not reused across independent proof batches
- [ ] Batch verifier failure is fail-closed, never partial-accept

## FRI-specific

- [ ] Query count and domain size match claimed security target
- [ ] Folding factor is consistent across prover and verifier

## IPA-specific

- [ ] Inner product argument round count matches vector length
- [ ] Generator sets are independent and domain-separated
