# Pairing Checklist

Use this checklist when reviewing pairings, BLS verification, and aggregate
signature logic.

## Scheme and group roles

- [ ] The BLS variant is pinned: which group holds public keys and which
      holds signatures, and which scheme (basic, message augmentation, or
      proof of possession) with its ciphersuite ID
- [ ] G1/G2 assignment consistency: public keys and signatures stay in the
      intended groups throughout the protocol, prepared forms included

## Input validation before pairing

- [ ] Every point entering a pairing passed the on-curve and subgroup
      checks of `references/ecc-checklist.md`, the signature included
- [ ] Public keys are validated once before use: valid encoding, not the
      identity, in the subgroup
- [ ] Library verify calls that take group-check or key-validation flags
      pass them enabled unless an earlier validation is cited
- [ ] An empty signer or signature list is invalid; a protocol-defined
      exception is unreachable wherever a quorum or weight is required
- [ ] Target-group elements received from outside are membership-checked
      before use

## Pairing equation

- [ ] Pairing equation direction: the implemented equation matches the
      protocol specification exactly, including argument order per term
- [ ] In product form, each negation is applied to the intended element
      exactly once
- [ ] Final exponentiation: raw Miller-loop outputs are not valid GT
      elements until final exponentiation is applied; no comparison or
      early exit uses a Miller-loop value
- [ ] The accept decision is the equality test itself; decode or pairing
      errors return reject, never fall through to accept
- [ ] Substituting the identity for each attacker-supplied point does not
      satisfy the equation, alone or combined with another attacker input

## Rogue-key defences

- [ ] Rogue key / key cancellation attack: aggregate signatures enforce
      proof of possession or message augmentation
- [ ] A proof of possession is verified for every key before it can enter
      an aggregate, on every registration path (genesis, migration, admin
      import included), and the verified status is bound to the stored key
- [ ] The proof-of-possession DST differs from the signing DST, so a
      signing oracle cannot produce a proof of possession
- [ ] Same-message fast aggregate verification is reachable only with
      proof-of-possession keys; the basic scheme rejects repeated messages
      in aggregate verification
- [ ] An aggregate public key equal to the identity is rejected

## Domain separation

- [ ] BLS domain separation (DST): `hash_to_curve` DST values are unique per
      protocol, suite, and version
- [ ] Message types that share a key (blocks, votes, proofs of possession)
      are separated by DST or by a domain field inside the signed message,
      applied identically by signer and verifier

## Aggregation

- [ ] Signature aggregation order independence: aggregation is commutative
      across signer orderings
- [ ] The signer set the verifier reconstructs (bitfield, index list) is
      the set whose keys are aggregated; duplicates are rejected or counted
      once toward any threshold
- [ ] The aggregate signature is subgroup-checked, or every component is

## Batch verification

- [ ] Batch verification randomness: random scalars are unpredictable and
      uninfluenceable by the prover
- [ ] Coefficients are nonzero, as wide as the claimed soundness error
      requires, and fixed only after every item is; hash-derived ones cover
      all keys, messages, and signatures in the batch
- [ ] A batch accepts exactly when every item verifies individually; on
      failure no item is marked or cached as verified
- [ ] Multi-Miller loop batching: multi-signature verification uses a
      reviewed multi-Miller path with a single final exponentiation and
      preserves correctness

## Optimized backends

- [ ] Each fast path (assembly, precomputed lines, GPU, alternative
      library) is differentially tested against the reference on identity,
      out-of-subgroup, and non-canonical inputs
- [ ] Prepared or cached points were validated before preparation
