# Proven State Transition Finding Patterns

Recurring bug classes in applications proven inside a zkVM or circuit and
settled on L1. Each names the authority-matrix row or settlement phase that
surfaces it.

## S1: Unauthenticated operation variant

- **Pattern:** an operation in the batch enum carries no signature, nonce, or
  L1 sender, often with a comment that permission is enforced off-chain.
- **Impact:** anyone who can produce a proof applies it; under permissionless
  fallback that is anyone.
- **Where:** admin, force-exit, config, and "internal" variants of the
  dispatch; every sibling of a found instance.

## S2: Prover-set metadata outside the committed leaf

- **Pattern:** an L1 action is committed by a hash of some fields, and the
  guest also reads a flag (skip, fallback, route) the prover sets next to it.
- **Impact:** a committed action is consumed as a no-op and the queue
  advances; the user's action is spent without effect.

## S3: Zero threshold disables verification

- **Pattern:** a signer threshold of zero short-circuits the signature loop;
  the config type permits zero; migration or genesis seeds zero.
- **Impact:** the prover sets oracle values at will until an operator
  overwrites every config.

## S4: Empty-leaf witness bypass

- **Pattern:** root recompute returns the stored root when no leaves are
  supplied; an insert-only transition then builds the new root from
  unvalidated siblings.
- **Impact:** forged new root for the whole tree from one benign insert.

## S5: Aggregate witness omission reprices an accrual

- **Pattern:** the set of markets or pools to update is whatever the witness
  contains; an omitted entry is "updated later" at the later batch's inputs.
- **Impact:** the prover moves value between sides of the accrual.

## S6: Independent queues, uncommitted interleaving

- **Pattern:** two accumulator chains with separate watermarks; no global
  order; the guest orders by prover-chosen sequence numbers.
- **Impact:** a later admin action is applied before an earlier user action
  and deterministically changes its outcome.

## S7: Queue head blocks forced exits

- **Pattern:** contiguous consumption plus an action that can become
  unexecutable (unpriceable asset, expired oracle value, missing config).
- **Impact:** every exit behind it is stuck; the condition is not always
  under administrative control.

## S8: Skipped-not-processed user action

- **Pattern:** the guest may mark a user's forced action as skipped and
  advance the watermark.
- **Impact:** the forcing mechanism users rely on is discretionary.

## S9: Non-force-includable guarantee

- **Pattern:** a documented guarantee (liquidation, key revocation, forced
  withdrawal) has no L1 queue path; only the submitter can include it.
- **Impact:** a submitter who keeps submitting valid batches censors it
  indefinitely.

## S10: Unbounded proving cost per operation

- **Pattern:** batches are sized by count; proof budget assumes a fixed cost
  per operation; one legal operation exceeds it.
- **Impact:** the batch cannot be proven, and settlement halts until an
  operator intervenes.

## S11: Identity-element public values

- **Pattern:** `min = u64::MAX`, `max = 0`, or an empty hash committed when
  the loop that updates them never runs; L1 checks each bound only against
  its own predecessor.
- **Impact:** garbage bounds pass, or the only guard is an unrelated
  downstream check that a refactor can remove.

## S12: Default-zero liveness timeout

- **Pattern:** a stall timeout or challenge window that is zero after
  deployment or proxy upgrade until an owner sets it.
- **Impact:** permissionless fallback is armed immediately, or never.

## S13: Missing L1 submission floor

- **Pattern:** L1 checks `maxTs <= block.timestamp` but not
  `block.timestamp - maxTs <= bound`.
- **Impact:** a valid proof is submitted after data availability retention,
  validator unbonding, or oracle validity has lapsed.

## S14: Gas-griefing callee in the payout loop

- **Pattern:** best-effort external calls forward 63/64 of remaining gas; one
  callee burns it all.
- **Impact:** later payouts and the batch submission itself run out of gas.
