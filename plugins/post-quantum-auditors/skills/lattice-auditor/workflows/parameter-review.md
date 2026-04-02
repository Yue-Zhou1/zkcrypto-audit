# Lattice Parameter Review Workflow

Step-by-step review for lattice parameter integrity, sampling behavior, and decapsulation safety.

## Phase 1: Verify parameter provenance

1. Inventory all LWE/RLWE parameter constants and references
2. Map constants to the claimed scheme/version and security level
3. Flag undocumented or custom parameter deviations for deeper review

## Phase 2: Trace sampling and randomness flows

1. Follow noise and rejection-sampling implementations from entropy source to output
2. Verify acceptance criteria and loop bounds match expected distributions
3. Check seed domain separation across public/secret derivation paths

## Phase 3: Review decryption and decapsulation behavior

1. Trace decryption failure conditions and reject handling
2. Validate decapsulation comparisons and failure responses for constant-time behavior
3. Confirm rounding/compression logic aligns with documented parameter assumptions

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
