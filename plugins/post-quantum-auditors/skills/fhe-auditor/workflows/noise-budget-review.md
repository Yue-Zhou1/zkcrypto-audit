# FHE Noise Budget Review Workflow

Step-by-step review for FHE noise accounting, bootstrapping correctness, and key-switch safety.

## Phase 1: Map ciphertext lifecycle

1. Enumerate ciphertext transforms from encryption through final consumption
2. Record modulus transitions and key-switch operations at each stage
3. Identify points where bootstrapping is expected to refresh accumulated noise

## Phase 2: Verify noise-budget calculations

1. Trace documented noise formulas against implementation constants and operations
2. Recompute budget consumption for representative operation chains
3. Flag paths where measured usage exceeds claimed safe depth

## Phase 3: Review bootstrapping and key-switch correctness

1. Validate bootstrapping parameter sets and refresh equations
2. Confirm modulus switching and key-switch operations enforce compatibility checks
3. Inspect boundary code for plaintext leakage in logs, debugging, or error surfaces

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
