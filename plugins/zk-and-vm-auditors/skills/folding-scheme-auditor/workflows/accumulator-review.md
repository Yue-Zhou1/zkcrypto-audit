# Accumulator Review Workflow

Executable review of a folding-based IVC: the fold, the challenge, the step
circuit, the curve cycle, and the decider.

1. **Identify the variant.**
   `grep -rniE "nova|protostar|sonobe|relaxed|cccs|running|accumul|ivc|fold" --include="*.rs" .`
   Record the folding scheme (Nova, HyperNova, ProtoStar, Sonobe, custom),
   the cycle of curves (Pasta, BN254/Grumpkin, other), the step circuit
   type (R1CS, Plonkish, custom), and the paper the code follows.

2. **Verify the folding equation.** For each `fold` or equivalent, write the
   update of every instance and witness field in the code's notation next
   to the paper's. Nova: `E = E1 + r·T + r²·E2`, `u = u1 + r·u2`,
   `x = x1 + r·x2`, and the same combination on W and on the commitments.
   Verify T is computed from the witnesses of both instances before
   folding. Flag any fold where T is zero, hardcoded, or where a field is
   copied instead of combined.

3. **Diff the absorb lists.** Write the ordered list of values absorbed
   before the challenge `r`, once for the native verifier and once for the
   in-circuit verifier. Both must contain both instance commitments and the
   cross-term commitment, with `r` derived after all of them. Any value in
   the fold that is on neither list, or after `r`, is a candidate. For
   HyperNova, check the sum-check transcript round by round.

4. **Verify step public input threading.** In the step circuit, find where
   the public input `x` is recomputed as a hash of the running accumulator
   from step i−1 and compared; accepting it as an input is not a check.
   List the hash preimage and compare it with the fold's inputs. Base case:
   at step 0 the running instance is the scheme's default (trivially
   satisfying) instance, checked explicitly, not left to the prover; fresh
   incoming instances are always strict (u = 1, E = 0). Find what selects
   the base branch and whether i != 0 can reach it.

5. **Check cycle-of-curves encoding.** For each value crossing curves,
   locate the encode and decode code and confirm an explicit range check
   bounds it to the receiving scalar field. Look for truncation or modular
   reduction that silently loses bits, and for non-native limbs that are
   never reduced.

6. **Verify the final SNARK.** Confirm the verifier key matches the step
   circuit's constraint system, the public inputs include the final
   accumulator hash, and the proof is verified end-to-end, not just
   deserialized. List what the decider's statement checks and compare it
   with every instance still open after the last step, on both curves.

7. **Attempt the forgeries.** In a scratch copy, run the prover with one
   change at a time: a different T after the challenge, an altered
   running-instance field between steps, a non-default initial instance, a
   different z0 or step count at final verification, a swapped decider key.
   Each must make verification fail.

8. **Hand off.** Compare candidates with `references/finding-patterns.md`,
   fill the output contract in `SKILL.md`, and route to `crypto-fp-check`.

## Failure rules

- A field is closed only when it appears in the absorb list before the
  challenge and in the state hash. "It is derived from bound values" needs
  the derivation shown in-circuit.
- A step-3 or step-4 gap with no forgery yet is `unverified`, not dropped.
- The paper is not evidence for the code: match every equation to a line.
- Stop at hash, commitment, and curve-arithmetic internals and route them.
