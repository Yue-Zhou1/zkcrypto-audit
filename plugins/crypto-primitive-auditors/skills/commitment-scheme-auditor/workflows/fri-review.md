# fri-review.md

Executable review workflow for FRI used as a polynomial commitment scheme.

1. **Extract the parameters the verifier enforces**, not the prover's
   configuration: field and extension degree, rate rho (tested degree bound
   over evaluation-domain size), query count s, folding factor per layer,
   final polynomial degree bound, grinding bits g, hash output length. Mark
   each as constant, configuration, or read from the proof. Anything read
   from the proof and not checked against configuration is P8.

2. **Recompute query-phase bits in each regime** (approximate, before
   lower-order terms):
   - proven, unique decoding: s * -log2((1 + rho) / 2)
   - proven, Johnson bound: about s * log2(1 / rho) / 2
   - conjectured: below s * log2(1 / rho). That figure assumed proximity
     gaps and list decodability up to capacity, conjectures disproved as
     stated in 2025; the revised conjectures are narrower, so treat it as
     a ceiling and name the conjecture the target relies on
   Add g to the query-phase figure only. State which regime the target's
   claim relies on. A claim that is only met in the conjectured regime is
   recorded as `residual_risk` with the regime named, not as a defect.

3. **Apply the caps.** The total cannot exceed what the challenge field
   allows (commit-phase and batching errors shrink with field size, not
   with queries) or half the hash output length. A claim above the
   smallest of these is P7.

4. **Check rho is the real rate.** Use the degree bound of the polynomial
   actually tested, after constraint-degree expansion and batching, not
   the trace length. Confirm prover and verifier use the same folding
   factor and layer schedule.

5. **Trace one query end to end.** Index derivation -> openings of the
   committed polynomials at that index -> recomputed layer-0 value
   (quotient by the out-of-domain point where used) -> each layer's fold
   with that layer's challenge -> index and coset mapping into the next
   layer -> comparison with the final polynomial's evaluation. Every value
   used must be either authenticated against a layer commitment or
   recomputed. A prover-supplied value with neither is P8.

6. **Check the final polynomial.** Its degree is bounded by configuration
   and its coefficients are absorbed before query indices are drawn.

7. **Check batching.** Polynomials of different degree bounds combined
   into one instance are each bounded (degree adjustment, or entry at the
   matching layer). Combination challenges come after all commitments.

8. **Exercise rejection** where tests run: flip one opened value in one
   layer, drop one query, lengthen the final polynomial, supply a nonce
   below the work threshold. Each must be rejected.

9. **Route and hand off.** Challenge and index derivation order to
   `fiat-shamir-auditor`, authentication paths to `merkle-tree-auditor`,
   AIR and composition degree to `zk-circuit-auditor`. Fill
   `soundness_accounting` and send candidates to `crypto-fp-check`.

## Failure rules

- A security level quoted without a regime is not accepted; recompute it.
- Do not report conjectured-regime parameters as broken; report the gap
  between the claim and the proven figure.
- Step 5 is done on verifier code; a check only the prover runs does not
  count.
