# Pairing Review

Review pairing verification and aggregation paths as a single semantic unit.

1. **Write the equation from the specification.** Put it in product form,
   `e(A1, B1) * ... * e(An, Bn) == 1`, and label every argument with its
   group and its source: attacker-supplied, trusted constant, or derived
   (hash-to-curve output, aggregate).

2. **Map the code onto it.** Confirm the pairing equation direction
   matches the protocol specification, term by term. Check G1/G2
   assignments and sign conventions across the entire verification path:
   where each negation is applied and to which element. Verify final
   exponentiation is applied before a GT result is interpreted, and that
   the accept decision is the equality itself (P8).

3. **Substitute degenerate inputs.** For each attacker-supplied argument,
   substitute the identity and decide whether the equation can hold. Then
   substitute `P` and `-P` for pairs of attacker inputs. Any case that
   holds without the secret is P4; name the check that should reject it.

4. **Enumerate key admission paths.** List every way a public key enters
   the set that can be aggregated: registration, genesis or config,
   migration, admin import. For each, find the rogue-key defence, proof of
   possession or message augmentation, and where its result is stored.
   Construct `pk' = [x]G - pk_victim` on paper and name the line that
   rejects it on each path (P5).

5. **Review DST controls.** Review `hash_to_curve` DST values for
   uniqueness across protocol, suite, and version. List every DST with the
   message type it signs; the proof-of-possession DST must differ from all
   signing DSTs (P6).

6. **Check aggregation semantics.** Verify aggregation is commutative and
   insensitive to signer order. Trace the empty set, a duplicated signer,
   and keys that sum to the identity through the verifier, and through any
   quorum or weight count built on the same signer set.

7. **Review batching.** Verify batch randomness is independent of attacker
   control: find where coefficients come from, their width, and whether
   whoever chose the batch items could know them first. Check multi-Miller
   loop batching against the reference semantics. Trace what the caller
   does when a batch fails; a retry that skips items or a cache write
   before the result is P7.

8. **Treat fast paths as forks.** Optimized pairing code is not
   automatically equivalent to the reference path. Treat every fast path
   as a semantic fork until proven otherwise: list each one, the inputs on
   which it could differ (identity, out-of-subgroup, non-canonical), and
   the test that compares it with the reference (P10). Where none exists,
   recommend `differential-test-harness-gen` in the handoff.

## Failure rules

- The equation is not reviewed until every argument has a labelled source.
- A proof-of-possession defence is not closed until every admission path
  from step 4 has a file:line for the check.
- A batching argument that depends on randomness quality is routed to
  `randomness-auditor`, not closed here.
- No candidate is called confirmed here; it goes to `crypto-fp-check`.
