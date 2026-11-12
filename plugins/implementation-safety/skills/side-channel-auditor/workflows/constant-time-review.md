# constant-time-review.md

Executable review workflow for constant-time claims and passive leakage
evidence.

1. **Fix the observer model** (remote timing, co-located, physical), from
   `crypto-audit-context` if available. It decides which leakage classes
   are findings and which are residual risk.

2. **Inventory secrets.** Key material, nonces, witness secrets, and
   intermediate sensitive state (shared secrets, unauthenticated
   plaintext, validity bits). Mark where each becomes public by protocol;
   its trace ends there.

3. **Trace each secret forward to the leaves.** Record every place it
   influences a branch, a table or memory index, a loop bound, a length or
   allocation size, a division or remainder, or a bignum call. Seed with
   `grep -rn "vartime\|ct_eq\|ConstantTimeEq\|conditional_select\|CtOption\|BigUint\|BigInt\|math/big\|mod_inverse\|memcmp"`.

4. **Classify each site:** (a) constant-time by construction, (b)
   variable-time but reached only with public data, (c) variable-time on a
   secret. For (b) list every caller and its argument origin; one secret
   caller makes it (c). Check constant-time helpers and their fallback
   paths for secret-independent behavior.

5. **Pin the build.** Compiler version, target, profile, feature set, and
   backend selectors per shipped artifact, from `dependency-auditor` if it
   has run. Repeat steps 6 and 7 for each distinct backend.

6. **Inspect the binary.** Build the release configuration and
   disassemble the functions from (a) and (c)
   (`objdump -d --no-show-raw-insn <release-binary>`). Look for conditional
   jumps fed by secret-derived flags, division instructions, and loads
   addressed through a secret-derived register. A branch found here
   overrides any source-level argument.

7. **Gather dynamic evidence where a harness is feasible.** A
   `ctgrind`-style check marks secret buffers as undefined for a memory
   checker and treats each reported conditional jump or address use as a
   site; it covers executed paths only and does not flag variable-latency
   instructions. A `dudect`-style test times the operation for fixed and
   random secret classes and compares the distributions. Capture
   microbenchmark distributions for suspicious paths. Record what ran, on
   which binary, with how many measurements.

8. **Walk the failure exits.** For every return after a secret is
   touched: timing relative to success, error value, log line, retry
   behavior, zeroization. Review prover paths against
   `references/zk-prover-patterns.md`. Then fill the output contract per
   candidate, with `next_route` set to `crypto-fp-check` plus cross-routes.

## Failure rules

- No `false_positive` on source reading alone when a compiler sits between
  source and observer; without binary or tool evidence it is `unverified`.
- A passed statistical test is evidence with its parameters, never proof.
- Do not report a variable-time operation without showing its operand is
  secret under the stated observer model.
- Power and EM candidates without measurements are `observation` or
  `residual_risk`.
- Follow a secret into dependencies, or record the boundary as untraced.
