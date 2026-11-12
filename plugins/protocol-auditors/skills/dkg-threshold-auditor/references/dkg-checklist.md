# dkg-threshold-auditor Checklist

Notation: n participants, threshold t, dealer polynomial f of degree t-1
with coefficient commitments C_0..C_(t-1), group order q.

## Identifiers and parameters

- [ ] Identifier space validation: participant identifiers are non-zero,
      distinct, and within the field, checked on the scalar after reduction
      mod q; zero-based array indices are never evaluation points.
- [ ] Participant identity binding: a share, commitment, or signature share
      from participant i is not accepted as participant j.
- [ ] 1 <= t <= n is enforced, and every dealer's commitment vector has
      exactly t entries.

## VSS share verification

- [ ] VSS share verification: each participant verifies every received
      share against the sender's public polynomial commitments before use.
- [ ] Share verification equation: `f(i)·G == Σ_j i^j·C_j` (C_j = a_j·G)
      is checked over the correct group and field, powers of i taken mod q,
      j running from 0 to t-1.
- [ ] Pedersen VSS: the second generator has no known discrete-log relation
      to G, and both share components enter the check.
- [ ] All participants verify against the same commitments (broadcast, echo,
      or transcript hash), and shares travel on authenticated, confidential
      channels.

## DKG rounds, key bias, and rogue keys

- [ ] Rogue key attack: MuSig2/FROST-style aggregation uses key aggregation
      coefficients, a key commitment, a proof of possession, or an
      equivalent defense; a plain sum of unproven keys is a finding.
- [ ] A proof of possession binds the key, the prover's identifier, and a
      context, under a domain separate from message signing, and is
      verified before the key or commitment is aggregated.
- [ ] No dealer can choose its contribution, or whether to be disqualified,
      after seeing others' unhidden commitments; otherwise the need for a
      uniform key is assessed.
- [ ] A dealer is disqualified only on evidence any party can check, so
      honest dealers cannot be framed.
- [ ] All honest parties agree on the qualified set, and a disqualified
      dealer's contribution is removed from shares and group key alike.
- [ ] Parties confirm the same group key and verification shares before
      use; signers later use these stored values, not the coordinator's.

## Nonces and signing sessions

- [ ] FROST nonce binding: nonces come from fresh randomness, and the
      binding factor covers the message, the aggregate (group) public key,
      the full commitment list, and the signer identifier.
- [ ] Before signing, a signer checks its own identifier and round-one
      commitments are in the commitment list, with unique identifiers.
- [ ] A secret nonce is used once: erased or marked used before the share
      is released, refused on a second request, never restored by
      persistence or recovery.
- [ ] In multi-party signing, nonces are not derived from key and message
      alone.
- [ ] MuSig2: two nonces per signer; the nonce coefficient binds aggregate
      key, aggregate nonces, and message; the secret nonce is tied to the
      signer's key and erased after one signature.
- [ ] Concurrent session isolation: multiple DKG or signing sessions keep
      independent state; no shared nonce pools or caches.

## Reconstruction, interpolation, and aggregation

- [ ] Threshold reconstruction correctness: exactly t valid, distinct shares
      reconstruct and t-1 shares reveal nothing.
- [ ] Lagrange interpolation denominator check: duplicate identifiers make
      the denominator zero and are rejected before inversion; a failed
      inversion is an error, never zero.
- [ ] Lagrange coefficients use the signer set of this session, the same
      set every signer used.
- [ ] Partial signatures can be checked against verification shares derived
      from the DKG commitments to identify a bad signer, and the combined
      signature is verified before release.
- [ ] Threshold BLS partials share one message and domain tag.

## Refresh, resharing, and abort paths

- [ ] Refresh polynomials have a zero constant term, checked on the
      commitment, and the group key is asserted unchanged.
- [ ] In resharing, each old holder's constant-term commitment equals its
      known verification share, and new holders use one agreed old quorum.
- [ ] Shares carry an epoch; old-epoch shares are erased and rejected.
- [ ] Protocol abort information leakage: partial rounds and abort paths do
      not leak secrets or shares through errors, logs, or complaint reveals.
- [ ] An abort discards session nonces; a retry is a new session.
