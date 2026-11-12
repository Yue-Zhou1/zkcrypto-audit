---
name: ethereum-crypto-auditor
description: >
  Audit Rust application code that uses Ethereum cryptography. Use when
  reviewing secp256k1/ECDSA usage, keccak/EIP-712 hashing, BN254/BLS12-381
  precompile interaction, KZG/EIP-4844 patterns, or alloy/ethers-rs API usage.
allowed-tools: Read Grep Glob Bash
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

- Curve arithmetic internals, subgroup mechanics, or pairing math ->
  `ecc-pairing-auditor`
- Generic ECDSA, Schnorr, or EdDSA library review outside Ethereum encoding ->
  `signature-scheme-auditor`
- Solidity, Vyper, or Huff verifier contracts and their precompile calls ->
  `onchain-verifier-auditor`
- KZG or other polynomial-commitment soundness -> `commitment-scheme-auditor`
- ZK circuit constraints -> `zk-circuit-auditor`; transcripts ->
  `fiat-shamir-auditor`
- Nonce generation and RNG lifecycle -> `randomness-auditor`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "ecrecover returned an address, so the signature is valid" | Recovery from the wrong hash or a forged signature still returns an address, just an unrelated one. When recovery fails outright the precompile returns empty output, which Solidity's `ecrecover` reports as the zero address. Compare against the expected signer and reject zero |
| "The library normalizes s for us" | Check the exact call: recovery and verification APIs differ on whether they reject high-s, and a relayed signature may not pass through either |
| "It is hashed with keccak, so it is domain separated" | Domain separation is the EIP-712 domain (chain ID, verifying contract) and type hash, not the hash function |
| "The precompile call returned, so the check passed" | A precompile signals failure through the call status or an empty return; unchecked length or status reads stale memory as success |
| "Chain ID is in the config" | It has to be in the signed bytes. Otherwise the signature replays on every chain that shares the key |
| "The blob commitment came from our own node" | The versioned hash, commitment, and proof must be checked against each other at the trust boundary that receives them |

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

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route point and subgroup validation to `ecc-pairing-auditor`,
  contract-side verifier logic to `onchain-verifier-auditor`, and nonce
  generation to `randomness-auditor`

## Output Contract

Produce an Ethereum-crypto handoff listing each candidate with:

- `entry_point`: the API call, precompile, or encoding path involved
- `area`: ECDSA, hashing, precompile, KZG, or API layer
- `signed_or_hashed_bytes`: what is actually bound, and what is missing
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/ethereum-crypto-checklist.md](references/ethereum-crypto-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/secp256k1-ecdsa-review.md](workflows/secp256k1-ecdsa-review.md)
- [workflows/evm-precompile-review.md](workflows/evm-precompile-review.md)
