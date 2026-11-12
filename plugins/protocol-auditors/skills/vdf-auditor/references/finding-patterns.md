# vdf-auditor Finding Patterns

## P1: Verifier accepts malformed proof exponent

- **Pattern:** exponent relation checks are incomplete or skipped: r not
  computed as 2^T mod l, T truncated, or the final equality weakened.
- **Impact:** a proof for a different exponent verifies.

## P2: Challenge derived from incomplete transcript

- **Pattern:** the challenge omits required binding inputs (y, g, T, group).
- **Impact:** with y unbound, a Wesolowski prover fixes the challenge,
  picks any proof value, and solves the verification equation for y.

## P3: Modulus/trapdoor source unvalidated

- **Pattern:** trusted setup assumptions are taken from unauthenticated
  parameters: N or the discriminant arrives with the proof, from a peer,
  or from mutable config; or one party generated N with no ceremony.
- **Impact:** the party knowing the group order computes outputs without
  delay; sequentiality is gone while every proof still verifies.

## P4: Delay parameter bypass via shortcut path

- **Pattern:** an alternate code path reduces sequential work without
  equivalent checks: prover-supplied T, T = 0, a sync mode that skips
  verification, or a checkpoint path that verifies only the last segment.
- **Impact:** outputs are accepted that took less than the protocol delay.

## P5: Batch verification reuses challenge randomness

- **Pattern:** batched proofs are combined with fixed, repeated, or
  predictable coefficients, or coefficients chosen before the proofs.
- **Impact:** independent proofs become linkable or mask invalid members:
  an error in one is cancelled by the inverse error in another.

## P6: Low-order element malleability

- **Pattern:** the group has a known low-order element, e.g. -1 in (Z/N)*.
- **Impact:** multiplying y by the low-order element, and likewise the
  proof computed for the new y's challenge, yields another accepted pair;
  the prover chooses between outputs.

## P7: Unchecked challenge prime

- **Pattern:** the verifier accepts l from the prover without re-deriving
  it or testing primality, or l is far shorter than the construction says.
- **Impact:** soundness no longer holds as proven; a free choice of l is P2.

## P8: Raw or trivial input element

- **Pattern:** the input is used directly as the group element, not
  hashed into the group, or identity-like values are accepted.
- **Impact:** the map is multiplicative, so outputs for products of known
  inputs come for free; trivial inputs have outputs known without work.

## P9: Pietrzak folding mismatch

- **Pattern:** proof length not tied to T, odd T halved by integer
  division, or a round challenge that omits the current midpoint.
- **Impact:** the verifier checks a statement about a different exponent,
  or the prover adapts a midpoint after seeing its challenge.

## P10: Non-canonical element encoding

- **Pattern:** unreduced class-group forms, RSA values at or above N, or
  both representatives of a quotient element are accepted and hashed.
- **Impact:** one output has several encodings, so its hash is prover-chosen.

## P11: Consumer bias through fallback or early use

- **Pattern:** the consumer uses y before verification, substitutes a
  fallback when the output is late, or lets the input be influenced for
  longer than the fastest evaluator needs.
- **Impact:** withholding or precomputation becomes a choice between
  outcomes; usually `observation` or `residual_risk` with the bias stated.
