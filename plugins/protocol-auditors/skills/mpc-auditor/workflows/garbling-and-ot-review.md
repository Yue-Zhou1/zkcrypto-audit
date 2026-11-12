# garbling-and-ot-review.md

Executable review workflow for garbled-circuit protocols and the oblivious
transfer beneath them. Run it for OT-based preprocessing as well.

1. **Pin the constructions.** Name the garbling scheme (classic Yao,
   free-XOR, half-gates, other), the base OT, the OT extension, and the
   paper for each. Record whether the claim is semi-honest or malicious.

2. **Inventory the path.**
   `grep -rn "garble\|evaluate\|label\|delta\|offset\|ot_\|choice\|extend"`
   and map: circuit source -> garble -> input-label transfer (OT) ->
   evaluate -> output decode. Note who supplies the circuit description.

3. **Trace label and offset lifetime.** Find where labels and the free-XOR
   offset are sampled and dropped. Ask the two-evaluation question: can a
   retry, reconnect, cached circuit, or second input reach the same
   garbled material (P4)?

4. **Write out the gate hash.** For one AND gate, list the exact hash
   inputs and confirm a tweak unique to the gate and half-gate. Identify
   the instantiation and the proof that covers it; an ad hoc fixed-key AES
   construction is a candidate until matched to a proven one.

5. **Find the garbler-correctness mechanism.** For cut-and-choose: who
   picks the challenge, whether it is fixed only after the garbler commits,
   and how the garbler's inputs are forced equal across evaluated copies.
   No mechanism under a malicious claim is P7.

6. **Construct the selective-failure garbler.** Corrupt one garbled row,
   then one of the two OT messages for a single input wire. If the
   evaluator's abort, error text, or timing differs with its input bit,
   record P6 with the leaked predicate.

7. **Review base OT.** Validation of received group elements, key
   derivation over the transcript elements the scheme specifies, and
   generation per session. Curve-level doubts go to `ecc-pairing-auditor`.

8. **Review OT extension.** Locate the consistency check and its abort
   path, the base-OT count against the security parameter, the output hash
   tweak, and the fate of the correlation secret after a failed check.

9. **Check role and input consistency.** The OT role comes from session
   setup, not from a peer message (P2). The value a party inputs through OT
   is the value used in every circuit copy and later round.

10. **Review the output path.** If the garbler learns the output, it must
    verify returned output labels. Record who learns the output first.

11. **Hand off.** Fill the output contract; forward to `crypto-fp-check`.

## Failure rules

- "The hash is AES" does not close step 4; name the tweak and the assumption.
- A selective-failure candidate needs the concrete corrupted message and
  the input predicate it reveals; without both it is `unverified`.
- Under a documented semi-honest claim, steps 5 and 6 yield `observation`
  entries at most, unless deployment contradicts the model.
- Stop at the OT or garbling library boundary when the library is out of
  scope; record its version and the calls made as `residual_risk`.
