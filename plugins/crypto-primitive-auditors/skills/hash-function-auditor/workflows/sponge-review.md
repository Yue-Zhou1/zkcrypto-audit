# sponge-review.md

Executable review workflow for hash instances, sponge construction, and
hash call-site correctness.

1. **Inventory the instances.**
   `grep -rnE "poseidon|rescue|mimc|pedersen|anemoi|griffin|sponge|permut"`
   Identify all sponge constructors and parameter sets in use. For each,
   record field, width, rate, capacity, S-box, round numbers, source of
   constants and matrix, and mode. Map each API to its intended security
   level and protocol context. One hash name can hide several instances.

2. **Reproduce the parameters.** Run the designers' round-number and
   constant-generation scripts for the recorded tuple and diff against the
   code; confirm the implementation matches its spec or design document.
   If the scripts cannot be run, compare with a published instance for the
   same tuple; failing that, the instance is `unverified` (P1). A round
   number mismatch is P2; constants belonging to another tuple, P3.

3. **Run a known-answer test** against the reference implementation's
   vectors for that instance. A failure with matching constants points at
   representation, round order, or linear-layer errors.

4. **Do the capacity arithmetic.** Capacity bits = capacity cells times
   field bits; compare with twice the security level. Do the same for the
   digest, after any truncation (P9).

5. **Walk the absorb path** with input lengths 0, 1, rate - 1, rate,
   rate + 1, and 2 * rate. For each write down which cells are written,
   when the permutation runs, and what padding is applied. Flag any path
   where callers can over-absorb without rejection or binding (P5). Then
   try to construct collisions: [a] vs [a, 0], inputs split differently
   across a block boundary, empty vs zero input (P7).

6. **Walk the squeeze path.** Which cells are output, how many per
   permutation, and whether any capacity cell is exposed. For compression
   wrappers check for reserved capacity or feed-forward (P6).

7. **Build the call-site table:** call site, instance, IV or tag, input
   arity, role. Verify tags are distinct across protocol uses. Look for
   two rows with the same instance and IV whose input spaces overlap but
   whose meanings differ, including transcript and Merkle contexts, and
   write the concrete colliding pair (P8).

8. **Check serialization before absorption.** How bytes, integers, and
   non-native values become field elements; whether each mapping is
   canonical and injective (P9).

9. **Compare native and in-circuit.** Same constant source or a test that
   proves equality; run both on random inputs plus 0 and p - 1 (P11).

10. **Cross-reference and hand off.** Compare with
    `references/finding-patterns.md`, query `zkbugs-index` for prior sponge
    and parameter incidents, and forward survivors to `crypto-fp-check`.

## Failure rules

- A hash name or library name does not close step 2; a diff does.
- A collision candidate is a concrete input pair, computed if code runs.
- Do not assert a cryptanalytic break. A margin finding cites the script
  output or a paper; otherwise it is an `observation`.
