# dkg-threshold-auditor Finding Patterns

## P1: Nonce reuse via shared state or retries

- **Pattern:** a nonce is derived without the message, e.g.
  `k = hash_to_scalar(sk.to_bytes())` (single-signer fix: RFC 6979-style
  derivation binding secret and message); a multi-party signer derives it
  from key and message only; or a signer answers twice from one stored
  nonce after a retry, crash recovery, or cache hit.
- **Impact:** two messages or two challenges under one nonce give two
  equations and enable private key recovery; a reused FROST nonce pair
  gives linear equations in the signing share.

## P2: Missing participant or session binding

- **Pattern:** messages, shares, or commitments carry no authenticated
  sender or session identifier, or the handler does not check them.
- **Impact:** messages or shares migrate across sessions or identities; a
  share from participant i is accepted as participant j.

## P3: Share verification omitted or incomplete

- **Pattern:** the VSS check is missing, runs after the share is stored,
  uses the wrong exponent indexing, or covers only some dealers.
- **Impact:** malicious shares poison DKG or signing rounds; honest parties
  hold shares of different polynomials and cannot sign.

## P4: Rogue-key cancellation

- **Pattern:** keys are summed with no aggregation coefficients and no
  verified proof of possession, or the proof can be replayed across
  provers, sessions, or signing domains.
- **Impact:** the attacker cancels the other keys and controls the aggregate.

## P5: Unbound nonce commitments under concurrent sessions

- **Pattern:** the effective nonce is a plain sum of commitments with no
  per-signer binding factor over message and commitment list.
- **Impact:** Wagner generalized-birthday or ROS-style attacks across
  parallel sessions forge a signature on a message nobody signed.

## P6: Zero or aliased identifier

- **Pattern:** identifiers are checked before reduction mod q, taken from
  zero-based indices, or not checked for duplicates.
- **Impact:** an identifier of zero receives the secret itself; duplicates
  zero a Lagrange denominator or let one party count twice toward t.

## P7: Commitment vector length unchecked

- **Pattern:** a dealer's coefficient commitments are accepted at any length.
- **Impact:** a longer vector silently raises the threshold; the group can
  no longer sign with t parties.

## P8: Key bias by late commitment or selective disqualification

- **Pattern:** dealers reveal Feldman commitments with no prior hiding
  commitment round, or can withdraw after seeing others' commitments.
- **Impact:** the last mover biases the group key; this matters when the
  key must be uniform, otherwise `observation`.

## P9: Unverifiable complaint

- **Pattern:** disqualification on an accusation with no checkable
  evidence, or a qualified set computed from each party's local view.
- **Impact:** honest dealers are framed out, or parties derive different
  group keys.

## P10: Refresh changes the key or mixes epochs

- **Pattern:** refresh contributions are not checked for a zero constant
  term, resharing is not tied to old verification shares, or shares carry
  no epoch.
- **Impact:** the group key shifts, or shares from different epochs are
  mixed and fail to reconstruct.
