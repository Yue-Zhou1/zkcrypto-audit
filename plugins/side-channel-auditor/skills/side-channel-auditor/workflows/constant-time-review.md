# Constant-Time Review Workflow

Step-by-step review for constant-time assumptions and side-channel leakage evidence.

## Phase 1: Identify secret-bearing values

1. Inventory key material, nonces, witness secrets, and intermediate sensitive states
2. Map each secret-bearing value into control-flow and memory-access paths
3. Record places where secrets influence branching, indexing, or loop bounds

## Phase 2: Validate implementation discipline

1. Check constant-time primitives and fallback paths for secret-independent behavior
2. Inspect branch points and table lookups for secret-derived predicates/indices
3. Review compiler/feature-flag combinations for constant-time regressions

## Phase 3: Require tool-backed evidence where available

1. Run or review `dudect` timing-distribution results
2. Run or review `ctgrind` or equivalent memory-access analysis
3. Capture microbenchmark evidence for suspicious paths and compare distributions

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
