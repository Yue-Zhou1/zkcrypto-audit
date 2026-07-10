---
name: privacy-protocol-auditor
description: >
  Audit shielded-pool and mixer protocol logic: nullifier derivation,
  uniqueness, and spent-set semantics; note/value commitments and ownership
  binding; deposit/withdraw front-running; and state-transition replay
  domains. Use when reviewing privacy-protocol design above the circuit and
  Merkle layers.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# privacy-protocol-auditor

Domain auditor for the protocol layer of privacy systems (shielded pools,
mixers, private transfer protocols): the rules that connect commitments,
nullifiers, Merkle roots, and on-chain state into a double-spend-free,
unlinkable system.

## When to Use

- Auditing nullifier derivation, uniqueness, domain separation, and
  spent-set semantics
- Reviewing note/value commitments and their binding to ownership keys
- Reviewing deposit/withdraw flows, relayer roles, and front-running
  behavior
- Reviewing shielded-pool state transitions, join-splits, change-output
  linkage, and replay domains (forks, multiple pools, protocol versions)

## When NOT to Use

- Circuit constraint completeness of the proof itself -> `zk-circuit-auditor`
- Merkle tree mechanics (insertion, inclusion proofs, sparse defaults) ->
  `merkle-tree-auditor`
- Verifier-contract precompile/calldata mechanics -> `onchain-verifier-auditor`
- Commitment-scheme mathematics (Pedersen binding/hiding) ->
  `commitment-scheme-auditor`

## Core Review Areas

1. Nullifier derivation: computed from the note secret AND position/rho so
   each note has exactly one nullifier; domain-separated per pool, asset,
   chain, and protocol version
2. Spent-set semantics: nullifier recorded before external calls; checked
   against the same tree/root domain the proof was verified for
3. Commitment binding: note commitments bind owner key, value, randomness;
   ownership proof required to spend (not just knowledge of the commitment)
4. Root management: which historical roots are accepted, root freshness
   windows, and cross-root replay
5. Deposit/withdraw flow: front-running of deposits/withdrawals, relayer
   fee binding inside the proof statement, recipient binding
6. State transitions: join-split value conservation at the protocol level,
   change-output linkage/unlinkability, migration paths between pool
   versions

## Workflow

### Phase 1: Protocol state mapping

- Read `references/privacy-protocol-checklist.md`
- Map the state machine: commitments in, nullifiers out, roots accepted,
  and every state-mutating entry point

### Phase 2: Nullifier and transition review

- Execute `workflows/nullifier-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize nullifier collisions/aliasing, cross-domain replay, unbound
  relayer/recipient fields, and root acceptance gaps

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route constraint suspicions to `zk-circuit-auditor`, tree mechanics
  to `merkle-tree-auditor`, and verifier-call mechanics to
  `onchain-verifier-auditor`

## Output Contract

Produce a privacy-protocol handoff that includes:

- `protocol_state_transition`
- `nullifier_or_commitment_invariant`
- `privacy_or_replay_impact`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/privacy-protocol-checklist.md](references/privacy-protocol-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/nullifier-review.md](workflows/nullifier-review.md)
