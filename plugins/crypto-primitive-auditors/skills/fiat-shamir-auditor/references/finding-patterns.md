# fiat-shamir-auditor Finding Patterns

## P1: Frozen Heart (challenge independent of a prover message)

- **Pattern:** a commitment, claimed evaluation, or round polynomial is
  used in the verifier's checks but never absorbed.
- **Impact:** the prover fixes the challenge, then solves for the free
  message. Named in Trail of Bits' 2022 Girault/Bulletproofs/PlonK disclosure.

## P2: Challenge derived before all commitments absorbed

- **Pattern:** the absorb exists but runs after the squeeze, or a challenge
  is squeezed midway through a round's messages.
- **Impact:** the prover adapts the commitment after seeing the challenge.

## P3: Missing public input or statement (weak Fiat-Shamir)

- **Pattern:** the hash covers prover messages but not the public inputs,
  generators, public keys, or relation identifier.
- **Impact:** the prover chooses the statement after the challenge;
  verifier and prover may derive challenges for different statements.

## P4: Domain label reused across rounds or protocols

- **Pattern:** one label, or an unlabeled transcript, serves two rounds,
  proof types, or versions; a shared helper starts callers from one state.
- **Impact:** context collision; cross-round or cross-protocol replay.

## P5: Transcript reset between rounds

- **Pattern:** state is re-created or re-initialized between dependent
  rounds or before a sub-protocol, losing prior binding.
- **Impact:** later challenges ignore earlier commitments.

## P6: Weak or unsuitable hash for challenge derivation

- **Pattern:** challenges come from a non-collision-resistant hash, or a
  raw permutation with no capacity.
- **Impact:** the transform's random-oracle assumption fails.

## P7: Ambiguous absorb framing

- **Pattern:** variable-length values concatenated without lengths, or
  elements absorbed in a non-canonical or lossy encoding.
- **Impact:** two message sequences share one transcript and challenge.

## P8: Challenge taken from the proof

- **Pattern:** the verifier reads a challenge out of the proof and never
  recomputes it.
- **Impact:** the prover supplies any challenge; the transform is void.

## P9: Undersized, biased, or repeated challenge

- **Pattern:** one base-field challenge over a small field, truncation
  below the analysed width, plain `mod p` of a same-width digest, or one
  squeeze output returned for two challenges.
- **Impact:** soundness capped at the challenge width, or correlated
  challenges. Reduction bias alone is usually an `observation`.

## P10: Batching or query challenge not bound to what it selects

- **Pattern:** the scalar combining openings is derived before those
  proofs and evaluations are absorbed; query indices precede the last
  commitment; a grinding nonce is unabsorbed, unchecked, or proof-sized.
- **Impact:** the prover solves for cancelling terms or re-samples query
  positions for free. The batching case is the class in "The Last
  Challenge Attack" on a KZG-based PLONK verifier.

## P11: Verifier or native/in-circuit divergence

- **Pattern:** two verifiers for one system (native and in-circuit, or
  off-chain and on-chain) absorb different values, orders, or encodings.
- **Impact:** the weaker transcript leaves a value unbound (P1); in
  recursion the outer circuit accepts proofs the native verifier rejects.
