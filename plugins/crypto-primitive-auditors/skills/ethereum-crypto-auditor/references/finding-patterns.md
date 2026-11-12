# Finding Patterns

Common finding patterns for Ethereum crypto usage in Rust application code.

## High-Priority Patterns

### secp256k1 Malleability
Signature verification that accepts both low-s and high-s signatures creates
transaction malleability. Since Homestead (EIP-2) the Ethereum protocol rejects
transaction signatures with s > secp256k1n/2, but the ecrecover precompile still
accepts high-s; application code that skips this check or uses a library
without built-in rejection is vulnerable. For `k256`: verification rejects
high-s in 0.13.2 and later (0.12.0 to 0.13.1 accepted it), and
`Signature::normalize_s()` returns `None` when s is already low. The recovery
helpers in alloy-primitives and ethers (`Signature::recover*`) normalize s
internally, so a high-s signature recovers successfully and must be rejected
separately.

### ecrecover Silent Zero Address
Solidity's `ecrecover` returns the zero address on invalid input. The Rust
recovery APIs (alloy-primitives `recover_address_from_prehash`, ethers
`Signature::recover`, k256 `VerifyingKey::recover_from_prehash`) return `Err`
instead; the zero address reappears when Rust code maps that error to a default
address or mirrors the precompile's empty output. Code that checks
`recovered == expected` without also checking `recovered != Address::ZERO`
then accepts malformed input whenever `expected` is itself zero (an unset
signer or owner).

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
Point coordinates passed to the bn128 precompiles that are equal to or larger
than the BN254 base field modulus make the call fail and consume all gas
(EIP-196/197); they are not reduced. Rust code that forwards external bytes
directly without a range check lets the caller force that failure, and code
that reduces them first accepts more than one encoding of the same point. The
ECMUL scalar is different: any 256-bit value is accepted, so `s` and `s + q`
give the same result.

### KZG SRS Domain Mismatch
Using a KZG SRS from a different ceremony or for a different circuit/blob size
makes proofs created under the intended SRS fail. Using an SRS whose secret is
known or recoverable (a test setup, or one generated locally from a seed)
produces a verifier that accepts forged opening proofs. This is a
configuration-level bug that produces no arithmetic error.

### Precompile Return Length Not Validated
Precompile calls that return empty data on failure (ecrecover, where the call
itself succeeds) may be decoded as if they succeeded if the caller does not
validate return data length before decoding. The BN254, BLS12-381, and
point-evaluation precompiles instead fail the call, so the call status has to
be checked as well.
