---
name: zkvm-auditor
description: >
  Audit zkVM guest programs and proof systems for memory consistency,
  continuation proof soundness, precompile safety, and guest-host boundary
  violations across SP1, RISC Zero, and Valida. Use when reviewing guest
  input handling and unconstrained hints, public-values commitment and
  program-identifier pinning, precompile or syscall constraints, segment and
  shard aggregation, mock or dev proof modes, or zkEVM execution
  equivalence.
allowed-tools: Read Grep Glob Bash
---

# zkvm-auditor

Domain auditor for zkVM guest execution and proof integrity: the runtime
that proves a program ran, and the boundary where a guest takes input from
the host and commits public values.

**Core principle:** a zkVM proof binds a program identifier to its public
values. It says nothing about where the guest's input came from.

## When to Use

- Auditing SP1, RISC Zero, or Valida guest program security assumptions
- Reviewing precompile and syscall correctness in zkVM traces
- Checking continuation proof segment handoff and state consistency
- Validating guest-host boundary constraints for host-supplied values
- Reviewing what a guest commits as public values and how the verifier pins
  the program identifier (image ID or program verification key)
- Auditing zkEVM EVM-equivalence provers (Scroll, Polygon zkEVM, Linea):
  opcode equivalence, gas/circuit divergence, state/storage trie encoding,
  memory expansion, and precompile equivalence against the target chain's
  declared execution and bridge semantics

## When NOT to Use

- The application logic running *on* the zkVM (prover-supplied operations,
  sparse witnesses, public-value consumers, settlement queues) ->
  `proven-state-transition-auditor`; run both skills when the target is an
  application rather than a zkVM implementation
- The on-chain verifier contract and its key storage ->
  `onchain-verifier-auditor`
- Generic circuit auditing not tied to zkVM runtime semantics, including
  the prover's STARK/AIR protocol layer -> `zk-circuit-auditor`
- Low-level curve/pairing review without guest execution context ->
  `ecc-pairing-auditor`
- Cairo VM and Starknet programs -> `cairo-auditor`
- Folding-based or IVC proof composition -> `folding-scheme-auditor`
- Patch tables, lockfiles, advisory coverage -> `dependency-auditor`
- Declaring suspected issues confirmed without verification gates ->
  `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The proof verified, so the output is right" | The proof shows the program ran on some input. If the guest reads a value it neither commits nor checks against a committed value, the prover chose it |
| "The host is our own service" | The guest cannot tell who ran it. Anyone with the program can generate a proof with their own input, and a permissionless or compromised prover is the attacker |
| "It is ordinary Rust, the zkVM constrains it" | Hints and unconstrained blocks execute outside the proof, and precompile wrappers hand work to chips with their own preconditions. Only what the guest re-checks is proven |
| "The precompile is audited upstream" | That audit covers one release and the chip's stated preconditions. The guest may pin another release or fork, and the preconditions (valid points, distinct operands, reduced inputs) are the caller's |
| "The program key is set at deployment" | A key that cannot be rebuilt from the audited source identifies an unknown program. Who can change it, and from which build it came, are part of the statement |
| "Mock mode is test-only" | The switch is an environment variable or a verifier address. Unless the production configuration is shown to exclude it, a proof that proves nothing is accepted |

## Core Review Areas

1. Memory consistency — read/write trace matches execution semantics
2. Continuation proof — segment boundaries preserve state and control flow
3. Precompile safety — accelerated operations are fully constrained
4. Guest-host boundary — host-provided values validated in guest constraints
5. Syscall interface — I/O pathways do not leak witness assumptions
6. Program counter trace — no jumps outside valid code regions
7. Public values and program identity — what is committed, and where the
   image ID or program verification key is pinned
8. Aggregation — shard or segment recursion, proofs verified in the guest
9. Deployment — exit-code handling, mock or dev modes, toolchain versions

## Workflow

### Phase 1: Enumerate runtime boundaries

- Read `references/zkvm-checklist.md`
- Enumerate all precompile calls, host calls, and syscall entry points
- Record where guest data depends on host-provided values

### Phase 2: Guest boundary review

- Execute `workflows/guest-boundary-review.md`
- Classify every guest input and lay out the committed public values

### Phase 3: Constraint and trace verification

- Execute `workflows/precompile-review.md`
- Verify each precompile and guest-host exchange has explicit proof constraints
- Check memory consistency arguments for all read/write transitions

### Phase 4: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize unbound precompile output, memory table gaps, and continuation
  mismatch paths
- For zkEVM equivalence provers (Scroll, Polygon zkEVM, Linea), also read
  `references/zkevm-patterns.md` and check opcode semantics, gas accounting,
  memory expansion, state/storage trie encoding, and precompile results
  against the target's declared execution and bridge semantics. Apply mainnet
  Ethereum rules only when that is the stated equivalence boundary.

### Phase 5: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route application-level state-transition and settlement questions
  to `proven-state-transition-auditor`, the on-chain verifier contract to
  `onchain-verifier-auditor`, patch and version questions to
  `dependency-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known
  pattern; contributing an entry happens only after verification

## Output Contract

Produce a zkVM handoff listing each candidate with:

- `zkvm_and_release`: the zkVM, SDK and toolchain versions, and whether the
  zkVM itself or only a guest was in scope
- `affected_boundary`: the precompile, syscall, memory table, continuation
  segment, guest input, or public value involved; for zkEVM targets the
  `opcode_or_precompile_equivalence` at issue, any
  `gas_or_circuit_divergence` from the target semantics, and the
  `state_or_storage_encoding` involved
- `missing_constraint_or_binding`: the exact missing constraint, state
  binding, or trace invariant
- `issue_class`: runtime-boundary, memory-consistency, precompile,
  continuation, public-values, or deployment
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/zkvm-checklist.md](references/zkvm-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/zkevm-patterns.md](references/zkevm-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/guest-boundary-review.md](workflows/guest-boundary-review.md)
- [workflows/precompile-review.md](workflows/precompile-review.md)
