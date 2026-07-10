# nullifier-review.md

Executable review workflow for shielded-pool nullifier and state-transition
logic.

1. **Map the protocol state machine.** Enumerate state-mutating entry
   points (deposit, transfer, withdraw, migrate, admin). For each, list:
   commitments created, nullifiers consumed, roots read, value moved.

2. **Write down the nullifier derivation.**
   `grep -rn "nullifier\|nf\b\|spent\|nullifierHash"` across circuit,
   contract, and client code. Record the exact formula with variable
   provenance (secret vs public, per-note vs per-key) and check it against
   the position-uniqueness and PRF requirements in the checklist.

3. **Enumerate replay domains.** Build the tuple (chain ID, pool address,
   asset, version, tree/root domain) and check each element is bound in
   either the nullifier derivation or the proof's public inputs. Any
   missing element is a P2 candidate — state which concrete deployment
   pair makes it exploitable.

4. **Audit the spent-set path.** Confirm canonical encoding of the
   spent-set key (P1), check-then-record ordering relative to external
   calls (P5), and that no admin/upgrade path resets it.

5. **Audit statement binding.** List the verifier's public inputs and
   confirm recipient, relayer, fee, root, and any public amount are all
   inside (P4). Anything the contract trusts from calldata but the proof
   does not bind is a finding.

6. **Audit root acceptance.** Root history window size, staleness policy,
   and root-domain separation across trees/versions (P6).

7. **Check value conservation globally.** Sum semantics across
   multi-proof/join-split transactions and sign handling of public amounts
   (P8).

8. **Assess linkability.** Change-output distinguishability, denomination
   correlation, relayer metadata (P9) — usually `observation` or
   `residual_risk` dispositions.

9. **Produce the output contract.** For each candidate fill
   `protocol_state_transition`, `nullifier_or_commitment_invariant`,
   `privacy_or_replay_impact`, `evidence` (for Critical/High: a concrete
   double-spend/replay transaction sequence), `disposition`, and
   `next_route` (`crypto-fp-check`; cross-route to `zk-circuit-auditor`,
   `merkle-tree-auditor`, or `onchain-verifier-auditor` for layer-specific
   suspicions).
