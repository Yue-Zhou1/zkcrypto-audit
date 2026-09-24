---
name: proven-state-transition-auditor
description: >
  Audit applications whose state transition runs inside a zkVM or circuit and
  is settled by an L1 contract: rollups, validiums, proven exchanges, and
  bridges. Use when reviewing prover-supplied batch inputs, sparse state
  witnesses, committed public values, settlement-contract checks, L1 action
  queues, forced inclusion, escape-hatch liveness, or whether users and
  integrators can prove their own operations executed.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# proven-state-transition-auditor

Domain auditor for the application layer of a proven system: the state
transition function (STF) the guest executes, the witness it reads state
through, the public values it commits, and the settlement contract that
consumes them.

**Core principle:** a valid proof only shows the guest ran on *some* input.
Every byte of that input the prover chose, and every guarantee the settlement
contract does not check, is attack surface.

## When to Use

- The target executes application logic inside SP1, RISC Zero, Valida, a
  zkEVM, or a custom circuit, and an L1 contract accepts the resulting proof
- Batch inputs, operations, or hints are supplied by a prover, sequencer, or
  batch submitter rather than signed by the party they affect
- State is read through a sparse witness (Merkle proofs, partial maps) rather
  than loaded in full
- An L1 contract maintains action queues, forced-inclusion paths, escape
  hatches, deadman switches, or a payout loop driven by proven outputs

## When NOT to Use

- zkVM runtime internals (memory tables, continuations, syscall ABI,
  precompile constraints): `zkvm-auditor`
- Verifier-contract precompile math, scalar-field checks, VK provenance:
  `onchain-verifier-auditor`
- Merkle hash construction and node typing in isolation: `merkle-tree-auditor`
  (this skill covers what the *prover* supplies through that tree)
- General DeFi or Solidity review with no proof in the loop

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The prover is a trusted role" | Permissionless fallback, deadman switches, key compromise, and insider risk all make the prover the attacker; rate by impact under that model |
| "This operation is only injected by our own backend" | A comment is not a signature. If the guest does not check it, the proof does not either |
| "Omitting that entry just defers the update" | Deferred accruals are repriced at catch-up time; the transition differs and the root differs |
| "The queue is strictly ordered so nothing can be skipped" | Ordering within a queue says nothing about interleaving across queues, or about an item being consumed as a skip |
| "Fixed-depth proofs cannot be shortened" | That defeats one malformed-input class out of five (omitted, extra, reordered, empty, identity) |
| "Liveness is at most Medium" | Defeating a forced exit while funds are custodied is High under the shared severity framework |
| "The state root is proven, so users can verify their activity" | A state root proves balances at batch boundaries, not which operations ran. Inclusion, success, and result of a user operation are provable only if the statement commits them |
| "Events are only logs; compiling them out of the guest is an optimisation" | On the platform being replaced, logs were receipts anyone could prove against a block. Dropping them removes a guarantee integrators relied on |

## Core Review Areas

1. Prover-input authority: who sources each operation and field, what binds it
2. Sparse witness completeness: single-key, aggregate, insert-only, inner-node
3. Public values: field-by-field consumer on L1, empty and identity cases
4. Time: what the guest's clock is, and what L1 bounds above and below
5. Action queues and forced inclusion: ordering, contiguity, skip semantics,
   the force-includable set and the guarantee each member gives
6. Liveness controls: deadman defaults, timeouts, permissionless fallback
7. Payout loop: external calls, gas forwarding, token behaviour, recovery
8. Statement completeness: what an honest user or integrator can prove about
   their own operations from committed values and published data alone,
   compared with what the replaced platform gave them

## Workflow

### Phase 1: Roles and guarantees

- Take the actor table from `crypto-audit-context`
  (`references/roles-and-guarantees.md` there). If it is missing, build it
  now before reading code: every role that supplies input to the guest or
  the settlement contract, and what the design promises the other roles if
  that role is malicious, offline, or misconfigured.
- Each promise becomes a hypothesis for Phases 2 to 4.

### Phase 2: Prover-input authority matrix

- Execute `workflows/prover-input-authority-matrix.md`
- Fill one row per operation variant and per batch-input field
- A finding in one row does not close the handoff until every sibling row
  has a disposition

### Phase 3: Sparse witness review

- Execute `workflows/sparse-witness-review.md`
- Close a read path only with a two-witness argument: same old root,
  different new root is impossible, or a PoC shows it is possible

### Phase 4: Settlement review

- Execute `workflows/l1-settlement-review.md`
- Cover public values, statement completeness, time, queues, liveness
  controls, and the payout loop
- Statement completeness is about what the proof lets outsiders verify, not
  whether it is sound. It is usually an observation, rising to a finding when
  the design or the replaced platform promised that verifiability

### Phase 5: Pattern hunt and handoff

- Read `references/finding-patterns.md`
- Send surviving findings to `crypto-fp-check` with the matrix rows and
  witness arguments attached; the FP gate for this domain requires an
  adversarial construction attempt before a FALSE POSITIVE verdict
- Recommend `fuzz-harness-gen` when Phase 2 finds hand-rolled fixed-point or
  bignum arithmetic on a value path

## Output Contract

Produce a state-transition handoff that includes:

- `authority_matrix`: every operation variant and input field with `source`,
  `binding`, the five malformed-input outcomes, and `disposition`
- `witness_paths`: every read path with its completeness argument or PoC
- `public_values`: each committed field and the L1 check that consumes it
- `verifiability`: per user-facing operation class, whether inclusion,
  success, result, and order are provable, and from which committed value or
  published payload
- `liveness_guarantees`: each force-includable action, the timeout that backs
  it, its default after deployment or upgrade, and who can arm it
- `disposition` per candidate (`verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [workflows/prover-input-authority-matrix.md](workflows/prover-input-authority-matrix.md)
- [workflows/sparse-witness-review.md](workflows/sparse-witness-review.md)
- [workflows/l1-settlement-review.md](workflows/l1-settlement-review.md)
- [references/state-transition-checklist.md](references/state-transition-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
