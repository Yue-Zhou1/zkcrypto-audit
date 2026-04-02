# Cairo Audit Checklist

## Hint validation

- [ ] Every hint output is constrained by at least one assertion or range check
- [ ] Hint functions do not silently discard error cases
- [ ] Hint-provided field elements are bounded before use in arithmetic
- [ ] No hint output is used as a pointer or index without validation

## felt252 overflow

- [ ] Arithmetic on felt252 accounts for wrapping past the Stark prime
- [ ] Subtraction results checked for underflow where signedness matters
- [ ] Multiplication results bounded when used as array indices or lengths
- [ ] Division by zero handled explicitly (felt252 division is modular inverse)

## Builtin misuse

- [ ] range_check applied to all untrusted felt252 before u128/u64 conversion
- [ ] Pedersen hash inputs domain-separated to prevent collision across types
- [ ] ec_op point inputs validated as on-curve before operation
- [ ] Poseidon state initialized correctly per Starknet specification

## Sierra-to-CASM soundness

- [ ] Sierra safety guarantees not bypassed by inline CASM hints
- [ ] Gas metering consistent between Sierra IR and CASM execution
- [ ] Library dispatch targets validated (no arbitrary code execution via felt252 class hash)

## Storage layout

- [ ] Storage variable addresses do not collide (Pedersen(selector, keys))
- [ ] Mapping key domains do not overlap across different mappings
- [ ] Upgrade proxy storage slots follow ERC-1967 or Starknet equivalent
