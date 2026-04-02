---
name: side-channel-auditor
description: >
  Audit timing, cache, memory-access, and power-analysis leakage patterns,
  including compiler and feature-flag regressions that break constant-time
  assumptions.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# side-channel-auditor

Domain auditor for constant-time assumptions and microarchitectural leakage risk.

## When to Use

- Reviewing secret-dependent control-flow and memory-access behavior
- Auditing cache, branch-predictor, and power-related leakage surfaces
- Checking compiler/feature-flag combinations for constant-time regressions
- Verifying zeroization and error-handling latency do not leak secrets

## When NOT to Use

- Protocol-level correctness audits without side-channel threat surfaces
- Purely functional bugs unrelated to timing/cache/power leakage
- Declaring side-channel concerns confirmed without evidence-backed verification

## Core Review Areas

1. Secret-dependent branches and control-flow decisions
2. Table lookups and cache-line dependent access patterns
3. Variable-time arithmetic and modular-reduction hotspots
4. Compiler/feature-flag regressions that reintroduce leakage
5. Operational side effects (logging, errors, zeroization) that leak validity

## Workflow

### Phase 1: Secret-bearing inventory

- Read `references/side-channel-checklist.md`
- Execute `workflows/constant-time-review.md`
- Enumerate secret-bearing values and trace their influence on control/data flow

### Phase 2: Constant-time path analysis

- Validate constant-time helper usage and fallback behavior
- Inspect branch and memory-access patterns under secret variation
- Review compiler settings and feature flags for regression risk

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize secret-branch, table-index, optimization, and error-latency findings

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a side-channel-specific handoff that includes:

- The secret-bearing value and affected control/data path
- The leakage class (timing, cache, memory, power, or operational)
- Tool-backed evidence status (`dudect`, `ctgrind`, microbenchmarks) if available
- The next verification or reporting route

## Reference Index

- [references/side-channel-checklist.md](references/side-channel-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/constant-time-review.md](workflows/constant-time-review.md)
