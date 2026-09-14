# L1 Settlement Review

The settlement contract is the only place with a wall clock, a sense of who
called, and the authority to release funds. Everything the guest cannot check
must be checked here, and everything the design promises users must be
enforceable here without the prover's cooperation.

## Phase 1: Public values, field by field

1. List every word the guest commits and the exact L1 statement that
   consumes it. A committed field with no consumer is a red flag either way:
   the guest is doing work nobody checks, or L1 is trusting a field it
   should compare.
2. For each field, run the `empty` and `identity` rows from the authority
   matrix: what does a zero-operation batch commit, and does L1 accept it?
   Check pairwise sanity (`min <= max`, `newIndex >= oldIndex`,
   `newHeight > oldHeight`) is enforced somewhere, and where.
3. Check deployment binding: chain id, contract address, program key, and
   state-root schema version are either in the public values or made
   redundant by a check that cannot pass on a different deployment.

## Phase 2: Time

1. Name the guest's clock. If the guest has no wall clock, every freshness
   check inside it is relative to a prover-chosen timestamp.
2. On L1, find the ceiling (`maxTs <= block.timestamp`) and the floor
   (`block.timestamp - maxTs <= bound`). A missing floor lets a valid proof
   be withheld and submitted after every off-chain freshness assumption
   (data availability retention, oracle validity, unbonding periods) has
   expired.
3. For every off-chain window the guest checks relative to its own
   timestamps, confirm L1 pins those timestamps to real time tightly enough
   that the window still means something.

## Phase 3: Action queues and forced inclusion

1. Enumerate the queues: how many accumulator chains, what each contains,
   and whether the relative order of items across chains is committed
   anywhere (global sequence number, block number, or a single chain).
   Two chains with independent watermarks let the submitter interleave them
   at will.
2. Within a chain, confirm contiguity: can a batch skip an item, and if not,
   what happens when the head item cannot be executed? One unexecutable item
   at the head blocks every item behind it, including other users' exits.
   List every reason an item can become unexecutable and whether an
   administrator can always clear it.
3. Skip semantics: for every action type, can the guest consume it as a
   no-op or "skipped"? Who decides, is that decision committed on L1, and
   does the user get their funds or state back when it is skipped?
4. The force-includable set: list every user-facing guarantee ("you can
   always withdraw", "unhealthy accounts are always liquidated", "keys can
   always be revoked") and the action type that delivers it. Any guarantee
   with no force-includable action depends entirely on the submitter's
   goodwill, and a submitter who keeps submitting valid batches can censor
   it forever.

## Phase 4: Liveness controls

1. Deadman switch and permissionless fallback: what arms it, what the
   timeout is, and what its value is immediately after deployment or proxy
   upgrade. A zero default either arms the fallback instantly or never.
2. Who may submit batches, what clears that restriction, and what a
   cleared restriction allows given the authority matrix from Phase 2 of the
   skill. Permissionless submission plus any `prover_chosen` row with no
   binding is a direct exploit path.
3. Every owner-settable parameter that gates liveness: event emitted, old
   value checked, timelock, and the effect of leaving it unset.

## Phase 5: Payout loop

1. For every external call made while settling proven outputs: is failure
   caught, is the gas forwarded bounded, and can a callee that burns its
   whole stipend push later iterations into out-of-gas? The 63/64 rule means
   the caller keeps only 1/64 of what it had.
2. Token behaviour in custody paths: fee-on-transfer and rebasing balances
   versus recorded amounts; ERC-721 and ERC-1155 sent to addresses that only
   sweep ERC-20; native fallback delivery; a recovery path for anything the
   sweep cannot move.
3. Replay and identity of each payout: a digest or id that binds recipient,
   asset, amount, and batch, and a spent set that survives retries.

## Phase 6: Handoff

Record per item: the guarantee, the enforcing check or its absence, the
default state after deployment, and the disposition. Route verifier-contract
precompile questions to `onchain-verifier-auditor`; everything else to
`crypto-fp-check`.
