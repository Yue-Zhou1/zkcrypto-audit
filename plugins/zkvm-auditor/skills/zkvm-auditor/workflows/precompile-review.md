# Precompile and Guest-Host Review Workflow

Step-by-step review for zkVM precompile safety and guest-host boundary integrity.

## Phase 1: Enumerate precompile and host-call surfaces

1. List every precompile invocation path in guest code
2. Enumerate guest-host interaction points (syscalls, host hints, external reads)
3. Record outputs that influence control flow, memory writes, or proof statements

## Phase 2: Verify constraint coverage

1. For each precompile output, identify the exact proof constraint that binds it
2. For each guest-host transfer, verify validation before any security-relevant use
3. Flag missing range/domain constraints or unchecked host-driven branches

## Phase 3: Validate memory and continuation invariants

1. Check memory consistency argument coverage for all relevant reads/writes
2. Confirm continuation segment handoff binds register state, memory root, and PC
3. Ensure segment ordering and linkage cannot be swapped or replayed

## Phase 4: Cross-reference and handoff

- Compare with `references/finding-patterns.md`
- Check `zkbugs-index` for prior zkVM memory/precompile cases
- Forward surviving findings to `crypto-fp-check`
