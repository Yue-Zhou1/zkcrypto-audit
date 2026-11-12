# Unconstrained Boundary Review Workflow

Executable review of every place a Noir program takes a value from Brillig
or an oracle into constrained code.

1. **Pin the toolchain.** Record the compiler version (`Nargo.toml`, lock or
   CI config) and backend version. Identify entry points and their `pub`
   parameters and return values; write the statement they express.

2. **Enumerate unconstrained boundaries.**
   `grep -rn "unconstrained fn\|unsafe {\|#\[oracle" --include="*.nr" .`
   List every `unconstrained fn` and Brillig-only helper, including those in
   dependencies. Map call sites: one row per value returned into constrained
   code, with its type (scalar, array, slice, struct) and the assertion
   coverage the author expected.

3. **Trace each row into constrained logic.** Follow the returned value
   through ACIR-constrained code. Verify at least one constrained assertion
   binds each security-relevant value and classify the row: `determined`,
   `bounded`, or `free`. Flag any path where the value influences
   proof-critical branching, indexing, or hashing before that constraint.
   Assertions inside the unconstrained callee do not count.

4. **Construct a counter-witness** for every `bounded` or `free` row: a
   different return value that satisfies all caller constraints. Typical
   shapes: quotient shifted so the equation holds modulo the field, a
   non-maximal "max", an index of a different element, an unsorted
   "sorted" array, a slice with extra or missing trailing entries.

5. **Review oracles.** Identify oracle inputs and outputs. Verify outputs
   are constrained before arithmetic, indexing, or commitment generation,
   and tied to a public commitment where they stand for external state.
   Failure handling must not silently substitute unconstrained defaults.

6. **Sweep types at the boundary.**
   `grep -rn " as u[0-9]\| as i[0-9]\| as Field\|wrapping_" --include="*.nr" .`
   For each cast or `Field` computation on a boundary value, state the range
   proven before it. No proven range means the truncated or wrapped value is
   a counter-witness for step 4.

7. **Check dual-runtime functions.** For functions called from both
   runtimes, run edge inputs (overflow, zero divisor, out-of-bounds index)
   in both and compare failure behavior.

8. **Test the candidates.** In a scratch copy, patch the unconstrained
   function to return the counter-witness and run `nargo execute` or the
   relevant test. If execution still succeeds, the candidate stands; keep
   the patch and output as evidence.

9. **Produce the output contract.** Compare candidates with
   `references/finding-patterns.md`, query `zkbugs-index` for Noir entries
   when one matches, fill the fields in `SKILL.md`, and forward surviving
   candidates to `crypto-fp-check`.

## Failure rules

- A row closes only with a constraint in constrained code that determines
  the value, or with a failed counter-witness test. "The helper computes it
  correctly" closes nothing.
- A candidate with no counter-witness yet is `unverified`, not dropped.
- Dependencies are in scope for step 2; an excluded one is residual risk.
- For language behavior, cite the pinned version's documentation or source.
