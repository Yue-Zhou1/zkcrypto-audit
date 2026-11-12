# commitment-scheme-auditor Checklist

## Trusted setup and parameters

- [ ] SRS provenance is documented and the loaded bytes are
      integrity-checked against a pinned hash.
- [ ] A loaded SRS that is not pinned is structurally validated: points on
      curve and in the subgroup, none the identity, first G1 element the
      generator, consecutive powers consistent under the pairing, G1 and G2
      parts built from the same tau.
- [ ] No unchecked fallback to local, untrusted, or freshly generated
      setup artifacts; code that samples tau is unreachable in production.
- [ ] Curve and group parameters match the scheme's requirements (curve,
      G2 element in the verifier, domain and root of unity).
- [ ] Derived SRS forms (Lagrange basis, truncated, extended) are
      recomputed from or checked against the pinned SRS.

## Degree bound

- [ ] The commitment path enforces the maximum polynomial degree: commit
      rejects coefficient vectors longer than the SRS instead of truncating.
- [ ] The verifier checks the claimed degree bound against setup and domain
      parameters.
- [ ] Degree metadata (lengths, bounds, domain sizes) cannot be
      attacker-controlled without validation.
- [ ] Where soundness needs a bound below the SRS length, an explicit
      check (shifted polynomial, truncated SRS) exists.

## Evaluation proof

- [ ] The opening is verified at the correct evaluation point and value;
      the implemented equation matches e(C - [y]_1, [1]_2) =
      e(pi, [tau - z]_2), or a rearrangement of it, term by term.
- [ ] The evaluation point is chosen by the verifier or transcript after
      the commitment is fixed, or is a fixed public point by design.
- [ ] The commitment in the equation is the one bound to the statement,
      not a second prover-supplied copy.
- [ ] The proof equation uses canonical commitment and point encodings;
      scalars are reduced and range-checked.
- [ ] The verifier rejects malformed or mixed-scheme proof objects; identity
      commitments and proofs are handled deliberately.
- [ ] If hiding is claimed, commitments carry blinding sufficient for the
      number of openings revealed.

## Batch opening

- [ ] The random linear-combination challenge is fresh and transcript-bound:
      derived after every commitment, value, and proof it combines.
- [ ] The challenge is not reused across independent proof batches.
- [ ] Batch verifier failure is fail-closed, never partial-accept; the
      result for an empty batch is deliberate.
- [ ] Each opening is paired with its own point and value; commitment,
      value, and proof vector lengths are checked equal.

## FRI-specific

- [ ] Query count and domain size (rate) match the claimed security target
      under a stated regime: proven or conjectured.
- [ ] The folding factor is consistent across prover and verifier, and the
      per-layer domain and index mapping agree with it.
- [ ] Each query checks every layer's fold against authenticated openings;
      layer-0 values are recomputed from the committed polynomials' openings.
- [ ] The final polynomial's degree bound is enforced and the last folded
      value is compared with its evaluation.
- [ ] Layer count, query count, and path lengths come from verifier
      parameters, not from the proof.
- [ ] Polynomials with different degree bounds batched into one instance
      are each bounded.
- [ ] Grinding bits are counted toward the query phase only; field or
      extension size and hash output length cap the claim.

## IPA-specific

- [ ] The inner product argument round count matches the vector length
      (log2 n rounds, n fixed by parameters).
- [ ] Generator sets are independent and domain-separated: derived by
      hash-to-curve from a public seed with distinct indices.
- [ ] The claimed evaluation or inner product is bound into the commitment
      with a transcript challenge before folding starts.
- [ ] Round challenges are checked invertible; the folded generator is
      recomputed by the verifier or by a deferred check that always runs.

## Pedersen-specific

- [ ] Generators have no known discrete-log relation (hash-to-curve from
      a public seed); identity and duplicate generators are rejected.
- [ ] A hiding claim has a uniformly random blinding scalar per
      commitment, never zero, constant, or reused.
- [ ] Applications that treat committed scalars as integers enforce the
      range separately (values wrap modulo the group order).
