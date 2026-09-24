# Proven State Transition Checklist

## Prover-input authority

- [ ] Every operation variant has a `source` other than `prover_chosen`, or a
      guest-checked binding that limits what a prover can do with it
- [ ] Every field that rides alongside L1-committed data is inside the leaf
      the contract hashed
- [ ] Signature thresholds cannot be configured to zero; zero is rejected,
      not treated as "no signers required"
- [ ] The signed struct includes the module, action type, and identity of
      the thing being set (oracle feed, key, pool), not only its value
- [ ] Nonce scope matches authority scope; a party being restricted cannot
      race the restricting party on a shared counter
- [ ] Every sibling variant of a confirmed finding has a recorded disposition

## Sparse witness

- [ ] Single-key reads fail closed on an omitted live key
- [ ] Aggregate reads are not used as proof of completeness for any
      value-affecting decision
- [ ] Deferred updates on omitted entries compute the same transition as
      timely updates
- [ ] Insert-only transitions validate supplied siblings against the old root
- [ ] Root recompute never returns the stored root without checking witnesses
- [ ] Empty-subtree sentinel cannot substitute for a populated subtree
- [ ] Path depth and sibling count are fixed by the tree type

## Public values and time

- [ ] Every committed field has a named L1 consumer
- [ ] A zero-operation batch either cannot be proven or commits values L1
      rejects
- [ ] Pairwise sanity of committed bounds is enforced on L1, not assumed
- [ ] Chain id, contract address, and program key are bound or redundant
- [ ] L1 enforces both a ceiling and a floor on committed timestamps
- [ ] Every guest-side freshness window is anchored to real time by that floor

## Statement completeness

- [ ] For each user-facing operation class, inclusion, success, result, and
      order are either provable from committed values or published data, or
      recorded as sequencer-trusted
- [ ] Data availability publishes enough to rebuild history, not only state,
      wherever the design promises users an auditable record
- [ ] Every guarantee the replaced platform gave for free (receipts, logs,
      public mempool, forced inclusion) is provided again or its removal is
      documented

## Queues and forced inclusion

- [ ] Relative order across accumulator chains is committed
- [ ] The consequence of an unexecutable head item is documented and clearable
- [ ] Skip-as-no-op is committed on L1 or impossible for user-facing actions
- [ ] Every user-facing guarantee maps to a force-includable action type
- [ ] Censoring a non-force-includable action cannot lock funds indefinitely

## Liveness controls

- [ ] Deadman timeout has a safe non-zero default after deploy and upgrade
- [ ] Clearing the submitter restriction cannot be triggered by a
      misconfiguration alone
- [ ] Every liveness parameter emits an event and checks the old value

## Payout loop

- [ ] External calls are bounded in gas and cannot exhaust the loop
- [ ] Fee-on-transfer, rebasing, ERC-721 and ERC-1155 behaviour is either
      supported or rejected at deposit
- [ ] Stray assets in custody addresses have a recovery path
- [ ] Each payout carries a replay-safe identity
