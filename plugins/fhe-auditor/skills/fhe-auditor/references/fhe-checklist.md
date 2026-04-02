# FHE Audit Checklist

## Ciphertext modulus transitions

- [ ] Modulus transitions are explicit and validated at each transform
- [ ] Modulus switching preserves correctness/error bounds as documented
- [ ] Transition order is consistent across encrypt/evaluate/decrypt flows

## Noise growth and budget

- [ ] Noise growth is tracked per operation and compared to safe bounds
- [ ] Claimed evaluation depth fits measured/derived noise budget
- [ ] Overflow/exhaustion handling is deterministic and visible

## Bootstrapping correctness

- [ ] Bootstrapping parameters match the intended scheme profile
- [ ] Refresh steps preserve required secret-dependent terms correctly
- [ ] Bootstrapping failure paths avoid silent downgrade or stale ciphertext use

## Slot packing and leakage boundaries

- [ ] Slot packing/unpacking enforces expected isolation assumptions
- [ ] Plaintext debug/log paths do not leak ciphertext-derived secrets
- [ ] Plaintext/ciphertext boundary checks are explicit at every interface

## Key-switch provenance

- [ ] Key-switch keys are sourced and versioned from trusted material
- [ ] Key-switch application validates dimensions/modulus compatibility
- [ ] Mismatched key-switch parameters fail closed
