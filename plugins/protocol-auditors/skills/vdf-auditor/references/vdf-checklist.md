# vdf-auditor Checklist

Notation: g the input element, y the claimed g^(2^T), l the challenge prime.

## Modulus/group setup

- [ ] The construction (Wesolowski, Pietrzak, other) and the group (RSA
      variant or class group) are pinned.
- [ ] Modulus/group parameters are validated against trusted sources: N or
      the discriminant comes from code, consensus, or a specified
      derivation, never from the proof or an unauthenticated peer.
- [ ] Trapdoor assumptions are explicit and documented: who could know the
      factorisation of N, and what the protocol loses if they do.
- [ ] Setup metadata (group description, T, version) cannot be swapped
      without detection: fixed in the verifier or bound into the challenge.
- [ ] RSA: the verifier works in a group with no known low-order element
      besides the identity (signed quadratic residues, or (Z/N)*/{+1,-1}
      with one canonical representative per element).
- [ ] Class group: the discriminant is negative, of the declared bit length,
      meets the construction's primality and congruence rule, and is
      recomputed or checked by the verifier.
- [ ] The input is hashed into the group with a domain tag; identity or
      other trivial g is rejected.

## Element validation

- [ ] y, the proof, and every Pietrzak midpoint decode as valid group
      elements: RSA values non-zero and below N; class-group forms reduced
      and of the expected discriminant.
- [ ] Non-canonical or over-long encodings are rejected, not normalised.

## Delay and sequentiality

- [ ] Delay parameter selection matches protocol security assumptions: T
      has an enforced minimum and the attacker speed advantage is stated.
- [ ] T comes from consensus or configuration, never unchecked from the
      prover; T = 0 and truncated T are rejected.
- [ ] The repeated-squaring implementation cannot skip sequential work: no
      production path uses a trapdoor or cached outputs.
- [ ] Fast paths (checkpoints, parallel provers, trusted-peer skips)
      preserve equivalent sequentiality guarantees.
- [ ] Each input is unpredictable before its delay window and not reused.

## Challenge derivation

- [ ] Challenge prime derivation includes complete transcript inputs: group
      description, g (or the input), y, and T; each Pietrzak round
      challenge also binds that round's midpoint and statement.
- [ ] Domain separation distinguishes setup, proving, and verification
      contexts, and hash-to-group from hash-to-prime.
- [ ] Challenge generation handles malformed input deterministically:
      prover and verifier hash the same canonical bytes or reject.
- [ ] Hash-to-prime samples from the prime set the construction specifies
      (Wesolowski: the first 2^(2k) primes for security parameter k), with
      the same primality test on both sides.
- [ ] A prover-supplied l or search hint is re-derived from the transcript
      and tested for primality by the verifier.

## Verifier soundness

- [ ] Verifier exponent checks match Wesolowski/Pietrzak requirements:
      r = 2^T mod l and proof^l * g^r == y; or the Pietrzak folding
      x' = x^r * mu, y' = mu^r * y ending with y == x^2.
- [ ] Proof relation checks reject malformed exponents and residues: r is
      below l, the Pietrzak proof length matches the halvings for T, and
      odd T follows the construction's rule.
- [ ] Integer types hold T and intermediate exponents without overflow.
- [ ] No caller reads y before verification returns success.

## Batching and operational controls

- [ ] Batched verification includes independent randomness where required:
      one coefficient per proof, fixed after all statements and proofs.
- [ ] Batch proof rules do not admit cross-proof contamination: an invalid
      member cannot be offset by another.
- [ ] Segmented proofs chain: each segment starts from the previous
      verified output and iteration counts sum to T.
- [ ] Resource/time limits do not silently disable verifier checks; a
      timeout or size cap rejects.
- [ ] Failure handling is consistent across standalone and batch
      verification; a failed batch is never partially accepted.

## Consumer-side use

- [ ] Randomness is derived from the canonical encoding of a verified y
      through a domain-separated hash bound to the epoch or chain.
- [ ] T exceeds the window in which any party can still influence the
      input, with margin for the stated attacker speed advantage.
- [ ] A late or missing output has no fallback that gives the withholder a
      choice between two values.
