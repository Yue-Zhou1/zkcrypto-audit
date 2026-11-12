# Frontend/Backend Review Workflow

Executable review of a gnark circuit from frontend declarations to backend
constraints, then through Go witness assignment, serialization, and setup.

1. **Pin the build.** Record gnark and gnark-crypto versions from `go.mod`.
   `grep -rn "frontend.Compile\|NewBuilder\|groth16\.\|plonk\." --include="*.go" .`
   Record curve, backend, and builder. If more than one combination ships,
   every later step runs once per combination.

2. **Write the statement.** `grep -rn 'gnark:"' --include="*.go" .` and list
   public fields in declaration order with the protocol value each carries;
   separate values meant to stay private from explicit public inputs. If no
   one-sentence statement can be written, record an observation and go on.

3. **Inventory and trace free wires.** One row per secret input, hint output
   (`grep -rn "NewHint"`), and emulated or gadget value fed from the witness:
   the security-critical values the prover controls. Follow each through
   `Define` and record where it is constrained (`AssertIsEqual`, selectors,
   range checks, gadgets). Classify: `determined` (unique given public
   inputs and determined rows), `bounded`, or `free`. Arithmetic on a value
   does not constrain it; a Go `if` is not a constraint. Evaluate
   selector-controlled paths with the selector at both values.

4. **Sweep API call sites** for `Div`, `DivUnchecked`, `Inverse`, `Cmp`,
   `IsZero`, `AssertIsLessOrEqual`, `ToBinary`, `FromBinary`. For each, write
   the operand ranges proven before the call and compare them with the
   precondition in the pinned version's doc comment.

5. **Construct an alternative assignment** for every `bounded` or `free` row
   and failed precondition: values the constraints accept that the honest
   solver would not produce (a + r decompositions, quotient and remainder
   shifted by a multiple of the divisor, a swapped branch value).

6. **Compile and compare.** Compile for each shipped builder and inspect the
   generated system: the public variable count equals the statement from
   step 2 (allow for a constant wire some builders count), every frontend
   invariant from step 3 has backend enforcement, and no backend
   optimization or selector weakened an expected constraint. Run each
   alternative assignment, through the test engine for witness changes and
   with a replaced hint function for hint outputs. If it solves, the
   candidate stands.

7. **Trace the Go witness path.** Follow every frontend input's assignment
   back to its external source: errors are propagated, no nil or default
   value is accepted silently, conversions into field elements do not reduce
   silently, and serialization keeps canonical field handling and
   visibility. Find where the verifier's public witness and the deployed
   keys come from; flag any setup call or SRS source reachable from non-test
   code.

8. **Produce the output contract.** Compare candidates with
   `references/finding-patterns.md`, fill the fields in `SKILL.md`, and hand
   off to `crypto-fp-check`; reporting and indexing follow from there.

## Failure rules

- "The hint is correct" never closes a row; only constraints that fix the
  output do. Passing tests with honest witnesses close nothing.
- A candidate with no alternative assignment yet is `unverified`, not dropped.
- A constraint count alone is not evidence: cite the path and the missing
  assertion. For API behavior, cite the pinned version's source or docs.
