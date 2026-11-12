# Hint Review Workflow

Executable review of where a Cairo program takes values the proof does not
compute, and whether the constraints that follow pin them down.

1. **Classify the target.** Cairo 0 (author-written hints), Cairo 1 Starknet
   contract (compiler-emitted hints only), or a Cairo 1 executable with
   custom hints or oracle-style calls. Record compiler version and, for
   Cairo 1, the allowed-libfuncs list. A Cairo 1 contract on the default
   list has no author-written hints: go to step 5 with calldata, signatures,
   L1 payloads, and syscall results as the hostile values.

2. **Enumerate hint boundaries.**
   `grep -rn "%{\|hint\|cheatcode" --include="*.cairo" .`
   Find every function with hint semantics or that produces witness values.
   For each, record what it computes outside the constraint system, which
   assertions and range checks bind those values after the hint, and what
   happens if the hint returns an arbitrary value.

3. **Trace each hint output forward to every use site.** At each site ask:
   - Is the value constrained by an assertion that would reject an
     arbitrary felt252?
   - If it is used in arithmetic, does the constraint cover the result, not
     just the input?
   - If it is used as an index, length, or pointer, does a range_check bound
     it to the expected domain?
   Any use site without a binding constraint is a soundness candidate.

4. **Construct an alternative hint output** for each candidate: a concrete
   felt the constraints accept and the honest hint would not produce
   (a quotient and remainder that satisfy the equation only modulo the
   prime, an index one past the array, a negative value as a large felt, a
   different dict value before squashing). Edit the hint in a scratch copy and run; if the program
   completes, the candidate stands.

5. **Sweep arithmetic and conversions on hostile values.** For each
   subtraction, multiplication, division, comparison, and narrowing
   conversion, write the range proven before it. In Cairo 0, check each
   comparison helper against its documented input domain.

6. **Verify error paths.** For each hint or call that can fail (division by
   zero, lookup miss, external call): does the failure abort the proof, or
   substitute a default? If a default, is that default constrained to be
   harmless? Flag any path that silently succeeds with incorrect data.

7. **Check builtin use.** Inputs validated before pedersen, poseidon, ec_op,
   and signature checks; outputs consumed, not discarded. In Cairo 0, every
   builtin pointer is returned advanced.

8. **Cross-reference and hand off.** Read `references/finding-patterns.md`
   for hint-level patterns, query `zkbugs-index` for Cairo entries on prior
   hint-related bugs, and fill the output contract in `SKILL.md`.

## Failure rules

- A hint output is closed only by a constraint that determines it, or by an
  alternative output that fails to run. Correct hint code closes nothing.
- "Cairo 1 is safe by construction" closes the hint steps only after the
  libfunc list and compiler version are recorded.
- A candidate without a constructed alternative is `unverified`, not dropped.
- At a syscall or L1 boundary, route what lies beyond it; do not assume the
  other side validates.
