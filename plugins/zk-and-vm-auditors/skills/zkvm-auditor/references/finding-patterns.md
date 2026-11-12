# zkVM Finding Patterns

Common vulnerability patterns across SP1, RISC Zero, and Valida-style zkVMs.
P1-P4 sit at the guest boundary, P5-P8 inside the zkVM's proof system,
P9-P12 in how proofs are produced and deployed. zkEVM equivalence patterns
are Z1-Z7 in `references/zkevm-patterns.md`.

## P1: Syscall read returns unvalidated host data

- **Pattern:** a value the guest reads from the host (stdin, read syscall,
  deserialized struct) reaches committed output or a security decision
  without being committed, checked against a committed value, or
  re-verified: the payload affects the proof path with no constraint on it.
- **Impact:** the proof shows the program ran on some input; the prover
  picks that input and with it the output.

## P2: Host hint injected without guest-side validation

- **Pattern:** a host hint or unconstrained-block result (inverse, square
  root, sort order, decompressed point) crosses into guest logic without
  range or domain checks, or with a check weaker than the relation the
  hint must satisfy.
- **Impact:** a wrong but accepted answer; downstream arithmetic, signature,
  or ordering logic proves a false result.

## P3: Public values or program identity not pinned

- **Pattern:** the guest omits a value the consumer relies on, commits
  fields in a layout the consumer decodes differently, or the verifier
  takes the program identifier (image ID, program verification key) from
  the caller, mutable storage, or a build not reproducible from the audited
  source.
- **Impact:** a valid proof of a different program, or of the right program
  with outputs read under the wrong meaning, is accepted.

## P4: Precompile output trusted without constraint verification

- **Pattern:** a precompile return value influences critical logic without
  a proof-level binding check: the chip under-constrains the operation, its
  memory accesses, or its link to the invoking instruction, or leaves a
  precondition (on-curve point, distinct operands, reduced input) to a
  caller that does not check it.
- **Impact:** the prover substitutes the result of a hash, signature
  recovery, or curve operation.

## P5: Memory access not enforced by memory consistency checks

- **Pattern:** a read or write path escapes memory table constraints or
  lookup coverage: an unrecorded access, unenforced timestamp ordering, an
  address initialized twice, a zero register that accepts writes.
- **Impact:** a read returns a value never written; the prover rewrites
  guest state mid-execution.

## P6: Continuation segment boundary state mismatch

- **Pattern:** the next segment starts from state not cryptographically
  linked to the previous segment's end (program counter, registers, memory
  commitment, running public-values digest), or segments can be dropped,
  reordered, or repeated.
- **Impact:** spliced execution: part of the program is skipped or replayed.

## P7: Shard proof aggregation gap

- **Pattern:** the recursion layer does not constrain every segment or
  shard proof to the same program and an allowed recursion-circuit key,
  does not enforce first and last segment conditions (entry point, halted),
  or leaves the flag marking a complete aggregate prover-controlled.
- **Impact:** a partial or foreign execution is wrapped as a complete proof
  of the target program.

## P8: Deferred proof verification not discharged

- **Pattern:** the guest verifies another proof through a call that only
  records a claim (program key, public-values digest) for the recursion
  layer; the key is host-supplied rather than constant or committed, or the
  proof type reaching the final verifier never checked the claims.
- **Impact:** the guest acts on an inner proof nobody verified, or on a
  proof of a program the prover chose.

## P9: Panic and exit-code semantics

- **Pattern:** the verification path accepts a proof without checking that
  execution ended in success, or the guest signals failure through a value
  the consumer ignores. Conversely, a user-reachable input panics the guest
  where it should be rejected and skipped.
- **Impact:** an aborted execution is treated as a valid result, or one bad
  input makes a batch unprovable and halts the system.

## P10: Development or mock proof mode reaches production

- **Pattern:** a mock prover, dev-mode environment flag, or mock verifier
  contract meant for testing is reachable in the deployed configuration.
- **Impact:** proofs carry no cryptographic assurance; anyone can assert
  any public values.

## P11: Toolchain and SDK version drift

- **Pattern:** guest toolchain, prover SDK, verifier, and on-chain verifier
  contract come from different releases, or the deployed program identifier
  was built with a toolchain or flags other than the audited build's.
- **Impact:** valid proofs are rejected, a release missing a published
  soundness fix stays deployed, or the audited source is not what is proven.

## P12: Proving cost blow-up

- **Pattern:** unbounded per-operation proving cost: batches sized by count
  while one legal operation exceeds the prover's cycle or gas budget;
  settlement stalls on that batch. Or precompile patch not wired: the
  accelerated fork is declared in `[patch]` but never resolved for the
  guest target, so hashing or signature recovery runs in software at many
  times the cost.
- **Impact:** proving exceeds its time or memory budget and liveness fails
  with no soundness bug involved.
