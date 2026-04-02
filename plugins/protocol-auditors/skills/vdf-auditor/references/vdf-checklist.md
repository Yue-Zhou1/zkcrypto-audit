# VDF Audit Checklist

## Delay and sequentiality

- [ ] Delay parameter selection matches protocol security assumptions
- [ ] Repeated-squaring implementation cannot skip sequential work
- [ ] Fast-paths preserve equivalent sequentiality guarantees

## Challenge derivation

- [ ] Challenge prime derivation includes complete transcript inputs
- [ ] Domain separation distinguishes setup, proving, and verification contexts
- [ ] Challenge generation handles malformed input deterministically

## Verifier soundness

- [ ] Verifier exponent checks match Wesolowski/Pietrzak requirements
- [ ] Proof relation checks reject malformed exponents and residues
- [ ] Batched verification includes independent randomness where required

## Modulus/group setup

- [ ] Modulus/group parameters are validated against trusted sources
- [ ] Trapdoor assumptions are explicit and documented
- [ ] Setup metadata cannot be swapped without detection

## Batching and operational controls

- [ ] Batch proof rules do not admit cross-proof contamination
- [ ] Resource/time limits do not silently disable verifier checks
- [ ] Failure handling is consistent across standalone and batch verification
