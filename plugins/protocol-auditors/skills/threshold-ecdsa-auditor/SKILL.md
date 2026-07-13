---
name: threshold-ecdsa-auditor
description: >
  Audit threshold ECDSA implementations (GG18, GG20, CGGMP21, Lindell-style)
  for Paillier modulus validity, MtA/MtAwc range-proof gaps, share-conversion
  soundness, resharing and concurrent-session isolation, and identifiable-abort
  leakage. Use when reviewing multi-party ECDSA keygen, signing, or resharing.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# threshold-ecdsa-auditor

Domain auditor for multi-party ECDSA: protocols that split an ECDSA key
across parties and sign via Paillier-based or OT-based share conversion
(GG18, GG20, CGGMP21, Lindell 2P-ECDSA and descendants).

## When to Use

- Auditing GG18/GG20/CGGMP21/Lindell-style keygen, signing, or resharing
- Reviewing Paillier modulus generation and validity (square-free,
  no-small-factor) proofs
- Reviewing MtA/MtAwc range and consistency proofs and share conversions
- Reviewing presignature handling, concurrent signing sessions, and
  identifiable-abort behavior

## When NOT to Use

- FROST, MuSig2, threshold Schnorr, or generic DKG/VSS review ->
  `dkg-threshold-auditor`
- Generic OT, garbled circuits, or share-MAC (SPDZ-style) review ->
  `mpc-auditor`
- Single-party ECDSA signing in an Ethereum application (ecrecover, EIP-712,
  alloy/ethers-rs) -> `ethereum-crypto-auditor`
- Generic single-party signature scheme review (verification equations,
  malleability, encodings) -> `signature-scheme-auditor`
- Nonce/CSPRNG generation mechanics -> `randomness-auditor`
- Timing/cache leakage of share arithmetic -> `side-channel-auditor`

## Core Review Areas

1. Paillier modulus N: generation, biprimality/square-free proof, and
   no-small-factor proof actually verified by every counterparty
2. MtA/MtAwc: range proofs present AND verified on both directions of the
   conversion; missing range proofs enable the classic key-extraction
   attacks (Alpha-Rays class)
3. Share conversion algebra: additive/multiplicative conversion consistency,
   Lagrange coefficient handling, and modulus mixing (mod N vs mod q)
4. Key generation: commitment-then-reveal ordering, feldman VSS checks,
   rogue-key resistance
5. Signing sessions: presignature single-use, concurrent-session state
   isolation, nonce contribution binding (k-share vs gamma-share)
6. Resharing: old-committee/new-committee authorization and share zeroization
7. Identifiable abort: blame paths must not leak share or nonce information
   (GG20 identifiable abort vs CGGMP21 accountability)

## Workflow

### Phase 1: Protocol and version mapping

- Read `references/threshold-ecdsa-checklist.md`
- Identify the exact construction and paper version (GG18 vs GG20 vs
  CGGMP21 revision) — checks differ per construction
- Map rounds to code: keygen, presign/sign, reshare entry points

### Phase 2: Paillier and MtA review

- Execute `workflows/mta-review.md`
- Verify modulus validity proofs and both MtA directions' range proofs

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize missing range-proof verification, presignature reuse,
  concurrent-session nonce leakage, and abort-path oracles

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route generic MPC building blocks to `mpc-auditor`, RNG concerns to
  `randomness-auditor`, and leakage concerns to `side-channel-auditor`

## Output Contract

Produce a threshold-ECDSA handoff that includes:

- `protocol_round`
- `proof_or_range_check`
- `invariant_at_risk`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/threshold-ecdsa-checklist.md](references/threshold-ecdsa-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/mta-review.md](workflows/mta-review.md)
