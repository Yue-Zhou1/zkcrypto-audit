# stark-air-review.md

Executable review workflow for generic STARK/AIR proof systems and
verifiers (outside Cairo/Starknet — Cairo hints and Sierra/CASM go to
`cairo-auditor`; standalone FRI-as-PCS review goes to
`commitment-scheme-auditor`).

1. **Map the AIR.** Enumerate trace columns (main, auxiliary, periodic),
   transition constraints, boundary constraints, and selectors. Build a
   column -> constraints coverage table; any writable column/update case
   without a covering constraint is an A1 candidate.

2. **Check trace padding and selectors.** How is the trace extended to a
   power of two? Verify the selector columns that gate constraints are
   themselves constrained to the intended shape (A2).

3. **Verify degree accounting.** Compute the max constraint degree
   (including selector and periodic factors), compare with the declared
   composition degree bound and blowup factor. Recompute rather than
   trusting comments (A3).

4. **Review composition/quotient construction.** Composition coefficients
   must be transcript-derived AFTER trace commitment; vanishing-polynomial
   exemptions must match the boundary rows exactly (A4).

5. **Check DEEP/OOD ordering.** The out-of-domain point must be sampled
   after ALL trace and composition commitments are absorbed, and OOD
   consistency between trace and composition openings must be checked (A6).

6. **Audit the FRI parameterization at the protocol layer.** Queries,
   blowup, grinding bits: recompute the soundness budget against the
   protocol's claim (ethSTARK-style accounting); confirm query positions
   are drawn after the final FRI commitment and are distinct per layer
   rule (A5).

7. **Check public-input binding.** Public inputs absorbed into the
   transcript before any challenge, and bound into boundary constraints
   with a canonical encoding (A7).

8. **Check verifier parameter provenance.** Every domain size, generator,
   field, and root the verifier uses must come from the protocol
   definition, not the proof (A8).

9. **Produce the standard output contract**, classifying each candidate by
   AIR constraint group, trace segment, composition/quotient step, or FRI
   parameter, and route survivors to `crypto-fp-check`.
