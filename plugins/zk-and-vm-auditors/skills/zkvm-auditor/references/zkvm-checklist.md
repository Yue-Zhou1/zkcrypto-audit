# zkVM Audit Checklist

## Memory consistency

- [ ] Read/write trace enforces correct value at every access
- [ ] Memory table permutation and lookup checks cover all accesses
- [ ] Out-of-range addresses are rejected by constraints

## Continuation proof

- [ ] Segment boundary state (registers, memory root, PC) is preserved
- [ ] Continuation link verifies previous segment commitment
- [ ] Segment ordering cannot be rearranged without proof failure

## Precompile safety

- [ ] Precompile input lengths and domains are constrained
- [ ] Precompile output is verified before downstream use
- [ ] Accelerator assumptions match the zkVM proving constraints

## Proving cost and liveness

- [ ] Per operation-type cycle or gas cost is measured (execute-only run, cycle tracker) and the worst legal operation is bounded
- [ ] Batch sizing accounts for cost, not only operation count; the prover's budget covers the worst batch a user can legally assemble
- [ ] A batch that exceeds the proving budget fails in a way the operator can recover from without halting settlement indefinitely
- [ ] Declared precompile patches are actually resolved for the guest target (see `dependency-auditor` patch-table checks); an unresolved patch is a cost regression that can turn into a liveness failure

## Guest-host boundary

- [ ] Host-provided values are validated in guest constraints
- [ ] Host I/O cannot bypass constraint checks
- [ ] Guest assertions bind all host-influenced control-flow decisions

## Syscall interface

- [ ] Syscall reads and writes are constrained by expected ABI shape
- [ ] External I/O does not leak unconstrained witness state
- [ ] Error return paths cannot silently succeed with unsafe defaults

## Program counter trace

- [ ] Program counter stays within valid code range
- [ ] Jumps and branches are constrained to legal targets
- [ ] Halt/exit semantics are uniquely defined and bound in trace
