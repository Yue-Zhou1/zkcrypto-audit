# Finding Patterns

Common finding patterns for Ethereum crypto usage in Rust application code.

## High-Priority Patterns

### secp256k1 Malleability
Signature verification that accepts both low-s and high-s signatures creates
transaction malleability. The Ethereum protocol normalizes to low-s; application
code that skips this check or uses a library without built-in normalization is
vulnerable. For `k256`: `Signature::normalize_s()` must be called before use
unless the library enforces it by default.

### ecrecover Silent Zero Address
`ecrecover` returns the zero address on invalid input in many Rust bindings
(mirroring Solidity behavior). Code that checks `recovered == expected` without
also checking `recovered != Address::ZERO` accepts forged signatures when the
input is malformed.

### EIP-712 Domain Separator Mismatch
Missing `chainId` in the domain separator allows cross-chain replay. Missing
`verifyingContract` allows cross-contract replay. Both are common when
implementing EIP-712 from scratch rather than using a library.

### keccak256 / SHA3-256 Confusion
Systems that interface with non-Ethereum components sometimes substitute SHA3-256
for keccak256. Hash outputs differ; this produces silent verification failures or
incorrect roots in Merkle trees.

## Medium-Priority Patterns

### BN254 Field Overflow
Inputs to the bn128 precompile that exceed the BN254 field modulus cause
undefined behavior on some EVM implementations and silent failure on others.
Rust code that forwards external bytes directly without a range check is
vulnerable.

### KZG SRS Domain Mismatch
Using a KZG SRS from a different ceremony or for a different circuit/blob size
produces a verifier that accepts invalid proofs. This is a configuration-level
bug that produces no arithmetic error.

### Precompile Return Length Not Validated
Precompile calls that return empty data on failure may be decoded as if they
succeeded if the caller does not validate return data length before decoding.
