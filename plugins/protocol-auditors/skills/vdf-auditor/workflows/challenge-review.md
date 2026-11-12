# challenge-review.md

Executable review workflow for VDF challenge derivation, verifier soundness,
and sequentiality guarantees.

1. **Pin construction and group.** Wesolowski, Pietrzak, or other; RSA
   variant or class group; the paper and the target's parameter
   specification. A verifier matching no construction is a candidate.

2. **Trace setup to verification.**
   `grep -rn "vdf\|modulus\|discriminant\|iterations\|hash_to_prime\|verify"`
   Enumerate setup parameters, delay values, and verifier inputs, marking
   each input fixed, consensus-derived, or prover-supplied. Trace proof
   generation outputs into verifier checks and on to the consumer.

3. **Tabulate the challenge transcript.** For every challenge, list the
   bytes hashed, in order, against the elements intended to bind it: group
   description, input or g, y, T, and for Pietrzak the round midpoint. For
   each missing element attempt the forgery: fix the challenge, choose the
   proof, solve for what was left unbound (P2).

4. **Review hash-to-prime.** Record the candidate sequence, primality test,
   and output size; for a prover-supplied prime or hint, find the verifier's
   re-derivation (P7). Confirm malformed or transcoded inputs cannot
   produce a permissive challenge.

5. **Rewrite the verifier equation.** Set the code's computation beside the
   paper's. Check the width of T and every exponent, the reduction of r, and
   for Pietrzak the proof length, odd-T rule, and final check (P1, P9).

6. **Test element handling.** For each decoded element decide the outcome
   for zero, the identity, a value at or above N, an unreduced form, and
   the low-order twist of a valid pair, for RSA (N - y, N - proof) with
   the proof computed for the challenge of N - y; an accepted variant is
   P6 or P10.

7. **Trace T and enumerate shortcuts.** Review repeated-squaring
   assumptions and delay enforcement from the source of T to the exponent.
   List all code paths that can bypass normal sequential verification:
   trapdoor evaluators, caches, sync modes, checkpoints, feature flags (P4).

8. **Review batching.** Find where coefficients come from and when they are
   fixed. Construct two invalid proofs whose errors cancel; if the batch
   accepts, record P5. Confirm independent challenge binding per member.

9. **Review setup provenance and the consumer.** Who produced N or the
   discriminant, on what evidence, and whether the verifier pins it (P3).
   Then verify-before-use, canonical output hashing, input timing against
   T, and late-output behaviour (P11).

10. **Hand off.** Compare candidates against `references/finding-patterns.md`,
    fill the output contract, and forward survivors to `crypto-fp-check`.
    Verified findings continue from there to `crypto-report-writer`.

## Failure rules

- A missing transcript element without a worked forgery is an `observation`.
- A passing verifier does not show sequentiality; close steps 7 and 9 apart.
- Provenance that cannot be established from the repository or published
  ceremony material is `unverified`, not safe.
- Stop at an out-of-scope bignum library boundary; record `residual_risk`.
