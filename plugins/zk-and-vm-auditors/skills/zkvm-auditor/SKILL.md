---
name: zkvm-auditor
description: >
  Audit zkVM guest programs and proof systems for memory consistency,
  continuation proof soundness, precompile safety, and guest-host boundary
  violations across SP1, RISC Zero, and Valida.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# zkvm-auditor

Domain auditor for zkVM guest execution and proof integrity.

## When to Use

- Auditing SP1, RISC Zero, or Valida guest program security assumptions
- Reviewing precompile and syscall correctness in zkVM traces
- Checking continuation proof segment handoff and state consistency
- Validating guest-host boundary constraints for host-supplied values
- Auditing zkEVM EVM-equivalence provers (Scroll, Polygon zkEVM, Linea):
  opcode equivalence, gas/circuit divergence, state/storage trie encoding,
  memory expansion, and precompile equivalence against the target chain's
  declared execution and bridge semantics

## When NOT to Use

- Generic circuit auditing not tied to zkVM runtime semantics
- Low-level curve/pairing review without guest execution context
- Declaring suspected issues confirmed without verification gates

## Core Review Areas

1. Memory consistency — read/write trace matches execution semantics
2. Continuation proof — segment boundaries preserve state and control flow
3. Precompile safety — accelerated operations are fully constrained
4. Guest-host boundary — host-provided values validated in guest constraints
5. Syscall interface — I/O pathways do not leak witness assumptions
6. Program counter trace — no jumps outside valid code regions

## Workflow

### Phase 1: Enumerate runtime boundaries

- Read `references/zkvm-checklist.md`
- Enumerate all precompile calls, host calls, and syscall entry points
- Record where guest data depends on host-provided values

### Phase 2: Constraint and trace verification

- Execute `workflows/precompile-review.md`
- Verify each precompile and guest-host exchange has explicit proof constraints
- Check memory consistency arguments for all read/write transitions

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize unbound precompile output, memory table gaps, and continuation mismatch paths
- For zkEVM equivalence provers (Scroll, Polygon zkEVM, Linea), also read
  `references/zkevm-patterns.md` and check opcode semantics, gas accounting,
  memory expansion, state/storage trie encoding, and precompile results
  against the target's declared execution and bridge semantics. Apply mainnet
  Ethereum rules only when that is the stated equivalence boundary.

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce a zkVM-specific handoff that includes:

- The affected precompile, syscall, memory table, or continuation segment
- The exact missing constraint, state binding, or trace invariant
- Whether the issue is runtime-boundary, memory-consistency, precompile, or continuation related
- For zkEVM targets: the opcode_or_precompile_equivalence at issue, any
  gas_or_circuit_divergence from the target semantics, and the
  state_or_storage_encoding involved
- The next verification or reporting route

## Reference Index

- [references/zkvm-checklist.md](references/zkvm-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/zkevm-patterns.md](references/zkevm-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/precompile-review.md](workflows/precompile-review.md)
