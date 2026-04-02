# Dependency Advisory Review Workflow

Step-by-step review for dependency advisories, feature semantics, and fork provenance.

## Phase 1: Enumerate dependency graph

1. Generate dependency graph with direct and transitive relationships
2. Isolate crypto-relevant crates/libraries and their active versions
3. Record profile-specific feature-flag sets used in production builds

## Phase 2: Map advisories and changelog deltas

1. Cross-check each dependency against advisory databases and upstream changelogs
2. Identify vulnerable versions pinned directly or transitively
3. Document required compensating controls for unavoidable exposures

## Phase 3: Validate feature and fork semantics

1. Review security-significant feature flags for each crypto dependency
2. Detect duplicate dependency stacks with incompatible assumptions
3. Compare forks/vendors against upstream security patch history

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
