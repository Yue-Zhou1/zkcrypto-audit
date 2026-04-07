---
name: ethereum-crypto-auditor
description: >
  Audit Rust application code that uses Ethereum cryptography. Use when
  reviewing secp256k1/ECDSA usage, keccak/EIP-712 hashing, BN254/BLS12-381
  precompile interaction, KZG/EIP-4844 patterns, or alloy/ethers-rs API usage.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# ethereum-crypto-auditor

Domain auditor for Ethereum cryptography usage in Rust application code.

## When to Use

- Auditing Rust code that calls secp256k1 signing, ecrecover, or ECDSA verification
- Reviewing keccak256 / EIP-712 / EIP-191 hashing in application logic
- Checking BN254 or BLS12-381 precompile input encoding and output decoding
- Auditing KZG blob commitment and opening proof handling (EIP-4844)
- Reviewing alloy / ethers-rs / web3 API usage for type confusion or encoding bugs

## When NOT to Use

- Auditing curve arithmetic internals or pairing math (use `ecc-pairing-auditor`)
- Reviewing ZK circuit constraints or transcript construction
- Declaring findings confirmed without `crypto-fp-check`

## Core Review Areas

1. secp256k1 / ECDSA usage — k-reuse, malleability (high/low-s), recovery ID, ecrecover input encoding
2. Ethereum hash functions — keccak256 vs SHA3-256, EIP-712 / EIP-191 domain separation, prefix handling
3. BN254 / BLS12-381 application usage — precompile input encoding (EIP-196/197, EIP-2537), subgroup membership checks, field element range validation
4. KZG / EIP-4844 usage — trusted setup assumptions, blob commitment encoding, opening proof verification
5. alloy / ethers-rs API misuse — type confusion, encoding errors, signature deserialization, address derivation from wrong public key form
6. EVM precompile interaction — input padding/encoding, output decoding, error handling on failure

## Workflow

### Phase 1: Checklist pass

- Read `references/ethereum-crypto-checklist.md`
- Identify all crypto entry points and classify by area
- Enumerate every ECDSA call, hash invocation, precompile interaction, and KZG operation

### Phase 2: ECDSA and hash review

- Execute `workflows/secp256k1-ecdsa-review.md`
- Treat every signature, ecrecover call, and hash-to-address path as hostile until validated
- Verify low-s normalization, recovery ID range, and EIP-712 domain separator construction

### Phase 3: Precompile and KZG review

- Execute `workflows/evm-precompile-review.md`
- Verify input encoding, subgroup membership, field range, and output decoding for every precompile call and KZG operation
- Check error handling on precompile failure and return data length validation

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce an Ethereum-crypto handoff that includes:

- The crypto entry points, API calls, and encoding paths involved
- The exact malleability, encoding, domain-separation, or type-confusion issue
- Whether the issue is ECDSA, hash, precompile, KZG, or API-layer
- The next verification or reporting route

## Reference Index

- [references/ethereum-crypto-checklist.md](references/ethereum-crypto-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/secp256k1-ecdsa-review.md](workflows/secp256k1-ecdsa-review.md)
- [workflows/evm-precompile-review.md](workflows/evm-precompile-review.md)
