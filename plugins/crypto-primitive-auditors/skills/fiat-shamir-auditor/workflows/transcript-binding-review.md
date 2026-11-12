# transcript-binding-review.md

Executable review workflow for Fiat-Shamir transcript and challenge binding.
Work from the verifier: it defines what is accepted.

1. **Pin the interactive protocol.** From the governing paper or spec,
   write the table: round -> prover messages -> challenges, plus the
   statement elements that should bind each challenge (relation or key id,
   public inputs, parameters). With no spec, infer it from the verifier's
   final checks and say so.

2. **Build the transcript timeline.**
   `grep -rnE "transcript|absorb|squeeze|challenge|append_|observe|sample"`
   List each verifier absorb and squeeze in execution order with label,
   value, encoding, and file:line. Mark where each challenge is derived and
   every transcript creation, fork, and reset. Open each helper.

3. **Compute each challenge's bound set:** everything absorbed into that
   state before the squeeze. For each prover-supplied value in the final
   checks, find the first challenge that multiplies it or evaluates it. A
   value outside that bound set is P1; absorbed later, P2. Finish the table
   for every challenge before investigating any one hit.

4. **Close the statement.** Each element from step 1 is in the first
   challenge's bound set (P3). For a value bound through a digest or
   commitment, confirm the digest covers it and is itself absorbed.

5. **Test framing and labels.** For each variable-length absorb, write
   the layout and try to build two message sequences with one absorbed
   stream (P7). Confirm labels are unique per round and context (P4).

6. **Check derivation.** Per challenge: hash, width, field reduction,
   distinct consecutive squeezes, challenge-space size against the
   soundness bound (P6, P9). A challenge read from the proof is P8. Check
   batching, query-sampling, and grinding challenges against the bound
   sets from step 3 (P10).

7. **Check continuity.** State what each later transcript inherits; a
   reset that drops required prior state between dependent rounds is P5.

8. **Diff the other side.** Repeat step 2 for the prover and any other
   verifier (in-circuit, on-chain); the verifier must mirror the prover
   exactly. Any difference is P11 until shown encoding-equivalent.

9. **State the adaptive strategy** per candidate: which value the prover
   changes, after which challenge, and why the final check still passes.
   If the code runs, mutate the unbound value in a valid proof and show
   the challenges do not change. That is independence, not yet a forgery.

10. **Cross-reference and hand off.** Compare with
    `references/finding-patterns.md`, query `zkbugs-index` for known
    transcript incidents, and forward survivors to `crypto-fp-check`.

## Failure rules

- A timeline built from the prover alone does not close the review.
- Every challenge needs a written bound set, not "the library does it".
- A missing absorb with no strategy yet is `unverified`. `false_positive`
  requires showing the value is fully determined by bound data.
- A value still choosable after a challenge that uses it is a soundness
  candidate, however hard the algebra looks.
