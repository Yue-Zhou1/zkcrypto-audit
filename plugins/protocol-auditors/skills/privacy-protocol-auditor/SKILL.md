---
name: privacy-protocol-auditor
description: >
  Audit shielded-pool and mixer protocol logic: nullifier derivation,
  uniqueness, and spent-set semantics; note/value commitments and ownership
  binding; deposit/withdraw front-running; and state-transition replay
  domains. Use when reviewing privacy-protocol design above the circuit and
  Merkle layers.
allowed-tools: Read Grep Glob Bash
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

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The circuit is sound, so double-spends are impossible" | Double-spend prevention is the on-chain nullifier set plus nullifier determinism. A nullifier that is not a unique function of the note, or that includes prover-chosen randomness, lets one note be spent twice with valid proofs |
| "Nullifiers are hashes, so they reveal nothing" | If the nullifier's inputs are guessable, or visibly related to the commitment, observers link deposits to spends. State what is hidden from whom, including from the sender |
| "Any recent root is acceptable" | The root-history window, and which tree and chain a root belongs to, define what membership means. An unbound or attacker-supplied root is forged membership |
| "The relayer only submits the transaction" | Unless recipient, fee, and relayer are public inputs bound by the proof, the relayer or a front-runner redirects the withdrawal |
| "Values are hidden, and the balance equation is checked" | Without range checks, a value that wraps the field satisfies the balance equation while creating funds |
| "Amounts are hidden, so privacy holds" | Metadata leaks: fixed versus variable amounts, timing, fee payment, note encryption and trial-decryption cost, and the scope of viewing keys |

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
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

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
