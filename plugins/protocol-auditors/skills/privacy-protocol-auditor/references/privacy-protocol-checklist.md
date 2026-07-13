# privacy-protocol-auditor Checklist

## Nullifier derivation and uniqueness

- [ ] Exactly one nullifier per note: derivation includes the note's
      position or a per-note uniqueness element (rho in Zcash Sapling), not
      just the owner secret — otherwise two identical notes share a
      nullifier and only one can ever be spent (griefing), or a note yields
      two nullifiers (double spend).
- [ ] The nullifier is a PRF of secret material (nk), not a plain hash of
      public values; observers must not link nullifier -> commitment.
- [ ] Domain separation: nullifier derivation is bound to pool address,
      asset/denomination, chain ID, and protocol version. Missing domains
      enable cross-pool or cross-fork replay of the same withdrawal proof.
- [ ] The nullifier's field/byte representation is canonical: no two
      encodings of the same nullifier pass the spent-set check as distinct
      values (uint256 vs field-reduced aliasing; cf. the input < r checks
      at the verifier layer).

## Spent-set semantics

- [ ] The nullifier is checked AND recorded before any external call or
      value transfer in the withdrawal path (reentrancy-safe ordering).
- [ ] The spent set is per-domain: a nullifier spent under root domain A
      cannot be replayed under domain B (multiple trees, migrated pools).
- [ ] Spent-set storage cannot be reset by pool re-initialization, proxy
      upgrade, or tree rotation.

## Commitments and ownership binding

- [ ] Note commitments bind owner public key, value, and blinding
      randomness; the spend proof requires the owner secret, not mere
      knowledge of the opening.
- [ ] Value commitments conserve value across join-splits at the protocol
      layer (sum of inputs = sum of outputs + public value), with the
      binding signature or equivalent enforcing it across the transaction.
- [ ] Commitment randomness is unique per note (reused randomness links
      notes and can break hiding).

## Root management and replay domains

- [ ] The set of accepted Merkle roots is bounded and explicit (root
      history window); proofs against ancient roots are an accepted,
      documented risk or rejected.
- [ ] A proof is bound to the specific root it was generated against, and
      that root is bound into the public inputs the verifier checks.
- [ ] Replay domains are complete: chain forks (chain ID), pool instances
      (contract address), asset types, and protocol versions all appear in
      either the statement or the nullifier derivation.

## Deposit/withdraw flow

- [ ] Deposit front-running: an attacker seeing a deposit commitment in the
      mempool cannot claim, cancel, or bind it to themselves.
- [ ] Withdrawal front-running: recipient and relayer fee are inside the
      proof statement (public inputs), so a relayer/observer cannot redirect
      funds or fees by tampering with unbound calldata.
- [ ] Relayer economics: fee bounds enforced; a malicious relayer can at
      worst censor, not steal or deanonymize.
- [ ] Change outputs: change notes are structurally indistinguishable from
      other outputs; timing/amount correlation is documented as residual
      risk where unavoidable.

## State transitions and migration

- [ ] Every state transition (deposit, transfer, withdraw, pool migration)
      preserves: value conservation, nullifier monotonicity (spent stays
      spent), and commitment-tree append-only behavior.
- [ ] Pool version migrations carry old nullifier sets forward or
      permanently disable the old pool's withdrawals.
- [ ] Emergency/admin paths (pause, root override, tree reset) are treated
      as protocol-breaking capabilities and reviewed as findings.
