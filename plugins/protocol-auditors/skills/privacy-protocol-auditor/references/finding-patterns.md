# privacy-protocol-auditor Finding Patterns

## P1: Nullifier aliasing via non-canonical encoding

- **Pattern:** spent set keyed by uint256 while the circuit proves knowledge
  of a field element; `nf` and `nf + r` are distinct keys but the same
  logical nullifier.
- **Impact:** double spend — the same note withdrawn multiple times. This is
  the protocol-layer twin of the verifier-layer missing `input < r` check.

## P2: Missing replay domain

- **Pattern:** nullifier or statement lacks chain ID, pool address, asset,
  or version binding.
- **Impact:** a withdrawal proof valid on one chain/fork/pool replays on
  another (post-fork double withdrawals; cross-instance replay for factory
  deployed pools).

## P3: Nullifier not bound to note position

- **Pattern:** nf = PRF(nk, note_secret) without rho/position; or two
  deposits of identical (value, key, randomness) collide.
- **Impact:** griefing (second identical note unspendable) or, with
  malleable derivation, double spend.

## P4: Unbound relayer/recipient calldata

- **Pattern:** withdraw(proof, root, nf, recipient, fee) where recipient or
  fee is not part of the public inputs the proof binds.
- **Impact:** mempool front-runner replaces recipient/fee and steals the
  withdrawal (classic mixer bug).

## P5: Spent-set write after external call

- **Pattern:** ETH/token transfer to recipient before `spent[nf] = true`.
- **Impact:** reentrant double withdrawal with one valid proof.

## P6: Root acceptance too wide

- **Pattern:** a root is accepted outside the protocol's declared history,
  finality, migration, or invalidation policy — not merely because it is old.
- **Impact:** if old roots can contain state the protocol later invalidates,
  a proof may spend against that state. An intentionally unbounded root
  history is a policy choice; assess it as such.

## P7: Deposit commitment front-running

- **Pattern:** deposit(commitment) claimable/cancelable by sender identity
  rather than note secret; or a pending deposit can be inserted by an
  attacker with the same commitment first.
- **Impact:** deposit theft or denial; user's note secret becomes useless.

## P8: Value non-conservation across join-split

- **Pattern:** protocol sums note values only inside the circuit while the
  contract accepts multiple proofs per transaction without a global balance
  check (or trusts an unchecked public "publicAmount" sign).
- **Impact:** minting shielded value from nothing.

## P9: Linkability leaks

- **Pattern:** change outputs identifiable by position/timing; deposits and
  withdrawals correlated by unique denominations; relayer metadata logged
  on-chain.
- **Impact:** deanonymization — an integrity-preserving but
  privacy-breaking finding class (usually `observation`/`residual_risk`).
