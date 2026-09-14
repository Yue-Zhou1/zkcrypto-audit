# zkVM Finding Patterns

Common vulnerability patterns across SP1, RISC Zero, and Valida-style zkVMs.

- **Precompile output trusted without constraint verification** — precompile return value influences critical logic without a proof-level binding check.
- **Memory access not enforced by memory consistency checks** — read/write path escapes memory table constraints or lookup coverage.
- **Continuation segment boundary state mismatch** — next segment starts from state not cryptographically linked to previous segment end.
- **Host hint injected without guest-side validation** — host-provided value crosses into guest logic without range/domain checks.
- **Syscall read returns unvalidated host data** — syscall payload directly affects proof path absent constraint enforcement.
- **Unbounded per-operation proving cost** — batches sized by count while one legal operation exceeds the prover's cycle or gas budget; settlement stalls on that batch.
- **Precompile patch not wired** — the accelerated fork is declared in `[patch]` but never resolved for the guest target, so hashing or signature recovery runs in software at many times the cost.
