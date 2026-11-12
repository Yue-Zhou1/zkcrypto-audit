# Setup Review

Review verifier and setup assumptions before concluding a proof system is
safe. This workflow covers what is specific to this circuit and its
verifier: key provenance, the proof-system verification equation, who owns
each opening point, batching across proofs, and recursion threading.
Commitment-scheme internals (the KZG, FRI, or IPA opening equation, SRS
structure validation, degree bounds, batch-opening combination) are owned by
`commitment-scheme-auditor`.

1. **Identify the trust model.** Record proof system, commitment scheme,
   curve or field, circuit size, and setup type: circuit-specific (Groth16
   phase 2), universal SRS, or transparent (FRI, IPA). Transparent systems
   skip step 3.

2. **Trace verifying-key provenance.** Walk back from the key the verifier
   actually uses (contract constant, embedded bytes, registry entry) to the
   circuit source. Rebuild the circuit at the audited commit, regenerate or
   re-export the key, and compare byte for byte. For snarkjs Groth16:

   ```
   snarkjs zkey verify circuit.r1cs pot_final.ptau circuit_final.zkey
   snarkjs zkey export verificationkey circuit_final.zkey vk.json
   ```

3. **Setup provenance.** Verify **KZG trusted setup provenance** or the
   equivalent trust model: which ceremony, file hash against the published
   one, curve, size covering the circuit domain. For phase 2, count
   independent contributors, verify the transcript, and confirm no circuit
   change postdates it. Grep production paths for locally generated
   parameters (`generate_random_parameters`, `circuit_specific_setup`, a
   `groth16 setup` / `zkey new` output with no contributions, fixed RNG
   seeds). Check the
   setup is not reused across incompatible circuits, public input layouts,
   or domains.

4. **Verifier equation.** Write the scheme's verification equation from the
   source in `references/spec-sources.md` beside the code and match term by
   term: sign conventions, negations, pairing sides, omitted terms, the
   public-input combination, every key element. Every parsed proof element
   must appear in the equation.

5. **Opening-point ownership.** Verify **KZG opening point soundness** as
   the verifier sees it: each evaluation point is derived by the verifier
   from the transcript after the opened commitments are absorbed, or is a
   fixed function of such a point and the key's domain generator. A point
   read from the proof or the caller is a candidate.

6. **Batching and lookups.** Check **Batch verification random challenge**
   derivation: it commits to all proofs and contexts in the batch, is
   unpredictable to the prover, and a failed batch is rejected whole. Review
   lookup and multiplicity logic for range or overflow edge cases: table
   fixed in the key or constrained, multiplicities unable to wrap the
   field characteristic.

7. **Recursion and aggregation threading.** Follow the inner verifier key
   digest and other required binding values (inner public inputs,
   accumulator limbs) through each layer's public inputs to the final
   verifier's check against a constant. Locate where any deferred pairing or
   accumulator check executes. Confirm aggregation preserves the same
   statement and setup assumptions end to end: the chain is only as trusted
   as its weakest setup.

8. **Hand off.** Fill the output contract per candidate, with the key
   provenance trail and the term-by-term equation table as evidence. Queue
   `commitment-scheme-auditor` when opening verification or SRS loading is
   hand-written.

## Failure Rules

- A locally generated production key is a candidate, not an observation; an
  unreproducible one stays `unverified` until a ceremony transcript or a
  reproducible build is produced
- An equation mismatch stays open until resolved by written algebra or a
  failing negative test; "equivalent" is not an argument
- A deferred check with no located executor is a soundness candidate
- Commitment-scheme internals are never closed here
