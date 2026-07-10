---
name: onchain-verifier-auditor
description: >
  Audit Solidity, Vyper, or Huff proof-verifier contracts for pairing
  precompile misuse, missing scalar-field checks on public inputs, calldata
  decoding errors, and verification-key provenance or upgrade risks. Use when
  reviewing on-chain SNARK/STARK verifier contracts or EIP-196/197/2537
  precompile call sites.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# onchain-verifier-auditor

Domain auditor for on-chain proof-verifier contracts: the EVM-side half of a
proof system, where a Solidity/Vyper/Huff contract decodes proof calldata,
checks public inputs, and delegates pairing math to precompiles.

## When to Use

- Auditing generated or hand-written verifier contracts (snarkjs, gnark,
  Halo2, custom) in Solidity, Vyper, or Huff
- Reviewing calls to the EVM pairing/add/mul precompiles (EIP-196/197 at
  0x06/0x07/0x08, EIP-2537 BLS12-381 precompiles)
- Checking public-input range validation against the scalar field modulus
- Reviewing verification-key storage, immutability, and upgrade authorization
- Reviewing ABI decoding and ordering of proof points and public inputs

## When NOT to Use

- Circuit constraint soundness or witness completeness -> `zk-circuit-auditor`
- Generic Rust/Go verifier implementations (arkworks, gnark backend) ->
  `zk-circuit-auditor` plus `ecc-pairing-auditor` and language-safety skills
- Nullifier uniqueness, spent-set, or replay policy -> `privacy-protocol-auditor`
- Ordinary Solidity authorization/reentrancy review with no proof
  verification involved -> out of collection scope; return to
  `crypto-audit-context` for scoping

## Core Review Areas

1. Precompile invocation: low-level call success flag AND returned verifier
   boolean both checked; gas forwarding; staticcall vs call
2. Exact input lengths: pairing input is a multiple of 192 bytes (EIP-197),
   EIP-2537 fixed operand sizes; EIP-197 empty-input-returns-true behavior
3. Public inputs strictly less than the scalar field modulus r
4. G1/G2 encoding, on-curve and subgroup behavior guaranteed (or not) by the
   invoked precompile, and what the contract must check itself
5. Verification-key provenance, immutability, and upgrade authorization
6. ABI decoding, proof/public-input ordering, and calldata length assumptions

## Workflow

### Phase 1: Verifier surface mapping

- Read `references/onchain-verifier-checklist.md`
- Execute `workflows/verifier-contract-review.md`
- Identify every external entry point that accepts a proof, the precompile
  addresses invoked, and where the verification key lives

### Phase 2: Precompile and input validation review

- Verify both the call success flag and the decoded output word are checked
- Verify pairing input length handling and the EIP-197 empty-input case
- Verify every public input is range-checked below the scalar field modulus
- Verify point encodings match the precompile's expected layout and that any
  subgroup checks not performed by the precompile are performed in-contract

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize ignored return values, missing field checks, VK upgrade paths,
  and malleable or reorderable calldata

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Route circuit-side suspicions to `zk-circuit-auditor` and curve/pairing
  math suspicions to `ecc-pairing-auditor`

## Output Contract

Produce a verifier-contract handoff that includes:

- `affected_component`
- `precompile_or_verifier_path`
- `invariant_at_risk`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/onchain-verifier-checklist.md](references/onchain-verifier-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/verifier-contract-review.md](workflows/verifier-contract-review.md)
