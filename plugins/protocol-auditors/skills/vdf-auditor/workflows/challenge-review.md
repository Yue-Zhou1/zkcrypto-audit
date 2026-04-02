# VDF Challenge Review Workflow

Step-by-step review for VDF challenge derivation, verifier soundness, and sequentiality guarantees.

## Phase 1: Trace setup to verification

1. Enumerate setup parameters, delay values, and verifier inputs
2. Trace proof generation outputs into verifier checks
3. Identify all code paths that can bypass normal sequential verification

## Phase 2: Validate challenge derivation

1. List transcript elements intended to bind challenge derivation
2. Confirm challenge generation includes all required setup and proof components
3. Verify malformed/transcoded inputs cannot produce permissive challenges

## Phase 3: Verify sequentiality and verifier checks

1. Review repeated-squaring assumptions and delay enforcement logic
2. Confirm verifier exponent equations reject malformed proofs
3. Validate batch verification keeps independent challenge binding where required

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
