# fiat-shamir-auditor Checklist

## Statement and public input binding

- [ ] Every public input value is absorbed before any challenge that
      depends on it.
- [ ] Statement context is absorbed: protocol id and version, circuit or
      verifying-key id, curve or field id, and every size the verifier uses
      (domain size, input count, vector lengths).
- [ ] Sigma protocols hash the generators and the statement (public keys,
      group elements), not only the prover's commitment.
- [ ] Verifier-relevant metadata that changes what is accepted (session,
      chain, verifier or recipient id) is bound into transcript state.
- [ ] Public input encoding is deterministic and canonical; two different
      input vectors cannot produce the same absorbed stream.

## Transcript completeness and order

- [ ] All prover commitments and messages of a round, and of every earlier
      round, are absorbed before that round's challenge is derived.
- [ ] No challenge is derived from partially built transcript state (no
      squeeze between the absorbs of one round's messages).
- [ ] Every prover-supplied value used in the verifier's final checks
      (commitments, evaluations, opening proofs, round polynomials, final
      FRI polynomial) is absorbed.
- [ ] The absorb order in code matches the specification's message order.
- [ ] The verifier recomputes every challenge; one carried in the proof is
      compared against the recomputed value, never used directly.

## Domain separation and framing

- [ ] A protocol-level label is absorbed first; distinct protocols,
      versions, proof types, and recursion layers use distinct labels.
- [ ] Distinct rounds and messages use distinct labels where the API takes
      them; no label names two different messages in one transcript.
- [ ] Labels are fixed constants with a canonical encoding, collision-free
      by construction (length-prefixed or fixed length).
- [ ] Helper APIs reused across protocols take the domain as an argument or
      continue the caller's transcript; none shares a domain by accident.
- [ ] Variable-length messages are length-prefixed or their count is
      absorbed, so the absorbed stream parses in exactly one way.
- [ ] Group and field elements are absorbed in one canonical encoding,
      identity included; non-native elements are decomposed injectively.

## Challenge derivation

- [ ] Challenge derivation uses a collision-resistant hash suitable as a
      random oracle (no MD5, SHA-1, or non-cryptographic hash).
- [ ] Challenge width or truncation does not weaken the soundness
      assumption; the challenge space is what the analysis requires.
- [ ] Over small fields, challenges come from an extension field (or the
      check is repeated) so the challenge space meets the target.
- [ ] Reduction into the field uses extra bits (RFC 9380 hash_to_field
      style) or rejection sampling; plain `mod p` is recorded with its bias.
- [ ] Consecutive challenges with no absorb between them are distinct
      outputs (counter, label, or ratchet), not one squeeze used twice.
- [ ] Sponge transcripts permute pending absorbed data in before a squeeze;
      an absorb after a squeeze does not reuse stale rate cells.
- [ ] Degenerate challenges (zero, or a point where the verifier divides)
      are rejected or handled without accepting.

## Multi-round, fork, and reset

- [ ] Transcript state is not reset between dependent rounds.
- [ ] Round transitions preserve prior binding: each later challenge
      depends on all earlier rounds' messages and challenges.
- [ ] Sub-protocol transcripts fork from the parent state; parallel forks
      absorb distinct labels; a continuing parent absorbs the result.
- [ ] A transcript object is not reused across independent proofs without
      re-initialization that re-absorbs the statement.

## Prover and verifier symmetry

- [ ] Verifier and prover derive identical transcript inputs: same values,
      order, labels, and encodings.
- [ ] An in-circuit transcript absorbs the same sequence as the native
      verifier for the same proof.
- [ ] Values the verifier recomputes instead of reading from the proof are
      recomputed only from bound data.

## Batching, query sampling, grinding

- [ ] Batching and aggregation challenges are derived after every
      commitment, claimed evaluation, and opening proof they combine.
- [ ] Verifier-local batching randomness comes from a CSPRNG; if derived
      deterministically, it binds every proof in the batch.
- [ ] Query indices are derived after the last commitment, the final
      polynomial, and any grinding nonce, and reduced without bias.
- [ ] The grinding nonce is absorbed after the commitments it covers; the
      verifier checks it against a bit count not read from the proof.
