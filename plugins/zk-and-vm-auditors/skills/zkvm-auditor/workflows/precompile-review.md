# Precompile and Guest-Host Review Workflow

Step-by-step review for zkVM precompile safety: the accelerated operations
(hashes, curve and big-integer arithmetic) a guest reaches through syscalls,
and the trace machinery that binds each call to the instruction that made
it. The guest input and public-values path has its own workflow,
`workflows/guest-boundary-review.md`.

1. **Fix the audit position.** zkVM chips or circuits in scope: run every
   step. Guest only: run steps 2, 5, 6, and 8, record the zkVM release, and
   report its precompile constraints as `residual_risk` at that release.

2. **Enumerate precompile and host-call surfaces.** List every precompile
   invocation path in guest code: direct syscall wrappers and crates swapped
   in through `[patch]` entries.

   ```
   grep -rnE "syscall_|ecall|\[patch" --include='*.rs' --include='*.toml' .
   cargo tree -i <patched-crate>     # run in the guest crate
   ```

   Pass the other guest-host interaction points (syscalls, host hints,
   external reads) to the guest-boundary workflow, which verifies each
   transfer is validated before any security-relevant use. Record every
   output that influences control flow, memory writes, or proof statements.

3. **Build one interface row per precompile.** Columns: syscall id,
   argument registers, memory words read and written, relation computed,
   preconditions. Fill it from the runtime's syscall table and the chip's
   trace definition, not from documentation.

4. **Verify constraint coverage per row.** For each precompile output,
   identify the exact proof constraint that binds it. Check four links in
   order and record the first that fails:
   - invocation: instruction row and precompile row agree on syscall id,
     timestamp, and argument pointers through a constrained lookup or
     permutation that padding rows cannot join
   - memory: every word read or written goes through the memory consistency
     argument at the call's timestamp; no input is a free witness
   - relation: fully constrained, including limb range checks and canonical
     reduction of results
   - edge inputs: identity, equal or opposite operands under incomplete
     addition formulas, zero, off-curve or unreduced inputs, maximum length

5. **Assign precondition ownership.** For every precondition, name who
   enforces it: the chip, the wrapper crate, or the guest author. For each
   left to the guest, find the check. Flag missing range or domain
   constraints, unchecked host-driven branches, and ignored error returns.

6. **Test behaviour.** Compare each precompile with a reference
   implementation on the step 4 edge inputs in execute mode (recommend
   `differential-test-harness-gen` to the user). That shows only what the
   executor computes. A constraint gap needs a tampered trace: a changed
   output that still proves and verifies.

7. **Validate memory and continuation invariants.** Check memory
   consistency argument coverage for all reads and writes the precompile
   performs. If precompile rows are proven in a different segment or shard
   than the invoking instruction, confirm the segment handoff binds register
   state, memory root, and PC, and that segment ordering and linkage cannot
   be swapped or replayed.

8. **Check wiring and cost.** Confirm from the `cargo tree` output or the
   lockfile that each patched crate resolves to the accelerated fork for
   the guest target; measure cycles per call in execute-only mode.

9. **Cross-reference and hand off.** Compare with
   `references/finding-patterns.md`, check `zkbugs-index` for prior zkVM
   memory and precompile cases, and forward surviving findings to
   `crypto-fp-check` with the interface row attached.

## Failure Rules

- An output with no located binding constraint is a candidate; "the
  executor computes it correctly" is not a constraint
- A precondition with no owner is a candidate when guest input can reach
  it, an observation otherwise
- With the zkVM in scope, no precompile is closed on execute-mode tests alone
- A guest-only audit never reports the zkVM's own constraints as verified
