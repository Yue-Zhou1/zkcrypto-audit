# Lattice Audit Checklist

## Parameter provenance

- [ ] LWE/RLWE parameter set maps to a documented scheme/security claim
- [ ] Modulus and dimension constants are consistent across code paths
- [ ] Security-level claims account for implementation-specific shortcuts

## Distribution sampling

- [ ] Noise sampling distribution matches the intended specification
- [ ] Rejection sampling enforces unbiased acceptance criteria
- [ ] Sampling loops do not leak secret-dependent timing or acceptance patterns

## Seed and domain separation

- [ ] Seed derivations use domain-separated contexts per role
- [ ] Public and secret derivation paths never reuse identical seed contexts
- [ ] Deterministic derivation includes collision-resistant transcript inputs

## Decryption failure bounds

- [ ] Decryption failure probability assumptions are explicit and validated
- [ ] Rounding/compression behavior matches proven bounds
- [ ] Failure handling cannot be exploited as an oracle

## Decapsulation and decoding

- [ ] Decapsulation reject behavior is constant-time where required
- [ ] Key encapsulation/decapsulation checks reject malformed ciphertexts deterministically
- [ ] Parsing and normalization preserve canonical field/ring representations
