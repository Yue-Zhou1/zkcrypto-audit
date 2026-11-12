# commitment-scheme-auditor Finding Patterns

## P1: Degree bound check missing on committed polynomial

- **Pattern:** the protocol assumes degree below d, but nothing limits the
  commitment beyond the SRS length, or the bound comes from the proof.
- **Impact:** the prover commits to a higher-degree polynomial than the
  verifier model assumes; identities that hold only at low degree are forged.

## P2: Evaluation point not verifier-owned, or reused across proofs

- **Pattern:** the opening point is prover-supplied, derived before the
  commitment is fixed, or the same challenge point serves independent proofs.
- **Impact:** the prover commits to polynomials that hold only at the known
  point; reused challenges weaken binding and enable cross-proof manipulation.

## P3: SRS loaded from untrusted source without validation

- **Pattern:** setup bytes come from a path, URL, or caller with no pinned
  hash and no structural check; a failed load falls back silently.
- **Impact:** the verifier trusts setup material with no integrity
  guarantee; whoever supplied it may know tau and can open to anything.

## P4: Test or locally generated setup reachable in production

- **Pattern:** tau sampled in-process (fixed seed, `rand`, a test helper)
  on a code path a release build can reach.
- **Impact:** known trapdoor; every opening and proof is forgeable.

## P5: Batch opening challenge derived before all commitments absorbed

- **Pattern:** the combining scalar is fixed before some commitment,
  claimed value, or opening proof in the batch, or reused between batches.
- **Impact:** the challenge is not bound to the full statement set; the
  prover picks terms whose errors cancel in the combination.

## P6: Opening equation checks the wrong object

- **Pattern:** sign or side error in the pairing equation, wrong G2 element,
  or a proof-supplied copy of the commitment instead of the bound one.
- **Impact:** a valid opening of an unrelated polynomial is accepted.

## P7: FRI parameters below the claimed security level

- **Pattern:** folding factor, query count, rate, or grinding inconsistent
  with the claimed security level; conjectured bits presented as proven;
  field-size or hash-output caps ignored.
- **Impact:** proof parameters undercut the expected soundness margin.

## P8: FRI consistency gap

- **Pattern:** layer-0 values not recomputed from the committed polynomials,
  a fold or the final polynomial degree unchecked, or proof-supplied counts.
- **Impact:** the low-degree test passes for a function unrelated to the
  commitments, or with fewer checks than configured.

## P9: Generators not provably independent

- **Pattern:** IPA or Pedersen generators produced as known multiples of
  one point, from a scalar RNG, repeated, or without documented derivation.
- **Impact:** hidden relations weaken binding; whoever knows one opens a
  commitment to different values.

## P10: Partial-accept or malformed-object acceptance

- **Pattern:** a batch verifier returns success after skipping failed
  items; wrong-scheme, wrong-length, or non-canonical objects are accepted.
- **Impact:** unverified openings are treated as verified.

## P11: Hiding claimed without blinding

- **Pattern:** deterministic commitment (plain KZG, Pedersen with zero or
  reused blinding) used where the value must stay secret.
- **Impact:** low-entropy values are found by trial commitment; equal
  values are linkable. No soundness impact.
