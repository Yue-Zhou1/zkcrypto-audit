# Unconstrained Boundary Review Workflow

Step-by-step review for Noir unconstrained function and oracle safety.

## Phase 1: Enumerate unconstrained boundaries

1. List every `unconstrained fn` and Brillig-only helper
2. For each unconstrained function, record outputs that flow into constrained code
3. Map call sites and identify expected constrained assertion coverage

## Phase 2: Trace boundary values into constrained logic

1. Follow each returned value into ACIR-constrained code
2. Verify at least one constrained assertion binds each security-relevant value
3. Flag any path where unconstrained function outputs influence proof-critical branching without checks

## Phase 3: Oracle review

1. Identify oracle inputs and outputs
2. Verify oracle outputs are constrained before arithmetic, indexing, or commitment generation
3. Validate failure handling does not silently allow unconstrained defaults

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Check `zkbugs-index` shard `index/by_dsl/noir.json` when available
- Forward surviving findings to `crypto-fp-check`
