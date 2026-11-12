# kzg-review.md

Executable review workflow for KZG-family commitment verification and
opening proof soundness. Step 8 extends it to IPA and Pedersen openings.

1. **Map the pipeline.** Identify commitment creation and verification
   entry points. Enumerate every proof object and evaluation point the
   verifier accepts. Record curve, SRS length, domain size, batching scheme,
   and whether hiding is claimed. Confirm scheme selection cannot mix
   incompatible proof variants.

2. **Trace the SRS from bytes to verifier constants.**
   `grep -rnE "srs|setup|tau|powers|trusted|params|unsafe|insecure|test_"`
   For each load point record source, pinned hash, and validation. An SRS
   sampled in-process is P4 unless build configuration, not a comment,
   excludes the path from release builds. An unpinned, unvalidated load is
   P3.

3. **Write out the opening equation as implemented** and compare it term
   by term with the specification: sides, signs, negations, the G2 element
   used. For each term record its origin: proof, verifying key, transcript,
   or caller (P6).

4. **Build the opening table.** One row per opening: commitment, point,
   value, proof, and who fixed each and when. The verifier must bind all
   four in one relation. A point the prover knew before fixing the
   commitment is P2 unless the design opens at a fixed public point.

5. **State each degree requirement.** For every committed polynomial write
   the bound the protocol needs and what enforces it (SRS length, shifted
   check, domain size). Confirm it is enforced before acceptance. No
   enforcer for a bound the soundness argument uses is P1.

6. **Expand the batch equation.** For each random coefficient record what
   was absorbed before it, and confirm it is derived after all commitments
   are absorbed. If a coefficient is known before any item it multiplies is
   fixed, name the item the prover solves for (P5). Route the derivation
   itself to `fiat-shamir-auditor`.

7. **Exercise rejection.** Where tests run, feed the verifier: a tampered
   value, the identity as commitment and as proof, a non-canonical
   encoding, mismatched vector lengths, a proof object of another variant,
   and one bad item inside a batch. Every case must return an explicit
   reject (P10). Route point-validation gaps to `ecc-pairing-auditor`.

8. **IPA and Pedersen paths.** Apply steps 3-7 with the scheme's final
   check in place of the pairing equation, then trace generator derivation
   to its seed and confirm no generator is a known multiple of another
   (P9). FRI paths go to `workflows/fri-review.md`.

9. **Cross-reference and hand off.** Compare with
   `references/finding-patterns.md`, query `zkbugs-index` for prior
   commitment and opening bugs, and forward survivors to `crypto-fp-check`.

## Failure rules

- A named ceremony is not evidence; the hash of the loaded bytes is.
- An equation "equivalent to the paper" is accepted only after the
  rearrangement is written out.
- An opening row with an unknown owner for the point stays `unverified`.
- Any accept on malformed input in step 7 is a candidate, forgery or not.
