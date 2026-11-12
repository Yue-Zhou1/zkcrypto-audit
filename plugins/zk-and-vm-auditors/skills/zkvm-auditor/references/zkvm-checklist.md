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

## Public values and program identity

- [ ] Every value the proof's consumer relies on is committed to public values, in a fixed order and encoding that the consumer decodes identically
- [ ] The verifier pins the program identifier (image ID or program verification key) as a constant or governed value, and that identifier is reproducible from the audited guest source with the project's deterministic build
- [ ] The verification call in use checks program identifier, public values, and successful exit together; no integrity-only or lower-level call stands in for it
- [ ] A guest panic or failed assertion yields no accepted proof, and no user-reachable input can force a panic on a path that must stay provable

## Recursion, aggregation, and deferred proofs

- [ ] The recursion layer constrains every segment or shard proof to the same program identifier and to an allowed set of recursion-circuit keys
- [ ] First-segment and last-segment conditions (entry program counter, initial memory, halted final state) are enforced in the aggregate, and its completeness flag cannot be set by the prover
- [ ] For a proof verified inside the guest, the program key is a constant or is committed, the public-values digest is the one the guest acts on, and the proof type that reaches the final verifier has checked those deferred claims

## Proof modes and toolchain

- [ ] No mock prover, dev-mode flag, or mock verifier contract is reachable in the production configuration
- [ ] Guest toolchain, prover SDK, and verifier (including any on-chain verifier contract) are pinned to mutually compatible releases that include the vendor's published security fixes
