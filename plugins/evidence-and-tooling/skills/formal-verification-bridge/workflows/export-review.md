# Export Review Workflow

Step-by-step workflow for tool availability checks, normalized export generation, and bounded external runs.

## Phase 1: Tool availability and scope gate

1. Check tool availability (`Ecne`, `Picus`, `Circomspect`) in current environment
2. Record version, binary path, and prerequisite status for each requested tool
3. Confirm target scope is minimal and tied to a verified finding context

## Phase 2: Build normalized export artifact

1. Assemble normalized artifact using `references/handoff-contract.md`
2. Ensure trust boundary assumptions and expected invariants are explicit
3. Save export artifact with deterministic naming and reproducible metadata

## Phase 3: Execute bounded tool run

1. Run selected tool with pinned settings and captured invocation command
2. Collect pass/fail/unknown results and raw diagnostics
3. Document unsupported constructs, approximations, and caveats

## Phase 4: Re-entry and handoff

- Return normalized results through `crypto-fp-check`
- Attach export artifact path and tool logs for report traceability
- Escalate unresolved tool failures as environment blockers, not verification success
