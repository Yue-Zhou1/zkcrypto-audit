---
name: dependency-auditor
description: >
  Audit cryptographic dependency sets for vulnerable versions,
  security-significant feature flags, advisory coverage, transitive risk, and
  stale fork provenance.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# dependency-auditor

Domain auditor for crypto dependency hygiene and supply-chain risk.

## When to Use

- Auditing lockfiles and dependency graphs for vulnerable cryptographic crates/libs
- Reviewing security-significant feature-flag semantics
- Checking transitive dependency duplication and semantic drift
- Validating fork provenance and patch divergence from upstream

## When NOT to Use

- Primitive-level cryptographic correctness audits without dependency concerns
- Runtime side-channel analysis detached from dependency configuration
- Declaring dependency risk confirmed without advisory and code-path verification

## Core Review Areas

1. Dependency lockfile completeness and version provenance
2. Advisory coverage for direct and transitive crypto dependencies
3. Security-significant feature-flag behavior
4. Fork provenance, patch drift, and vendored dependency auditability
5. Toolchain/MSRV drift and duplicate crypto stack semantics

## Workflow

### Phase 1: Graph and inventory

- Read `references/dependency-checklist.md`
- Execute `workflows/advisory-review.md`
- Enumerate direct/transitive crypto dependencies and active feature sets

### Phase 2: Advisory and feature review

- Compare dependency graph against known advisories/changelogs
- Validate security semantics for enabled/disabled feature-flag combinations
- Identify duplicate crates/libs with incompatible behavior expectations

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize vulnerable transitive pins, feature regressions, and stale fork drift

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a dependency-specific handoff that includes:

- The affected dependency path (direct/transitive/fork)
- The advisory, feature-flag, or provenance invariant at risk
- Whether the issue is versioning, feature semantics, duplicate stacks, or fork drift
- The next verification or reporting route

## Reference Index

- [references/dependency-checklist.md](references/dependency-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/advisory-review.md](workflows/advisory-review.md)
