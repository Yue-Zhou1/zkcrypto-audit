# Transcript Binding Review Workflow

Step-by-step review for Fiat-Shamir transcript and challenge binding integrity.

## Phase 1: Build transcript timeline

1. List each transcript absorb operation in execution order
2. Mark where each challenge is derived
3. Map which statement elements should bind each challenge

## Phase 2: Validate binding invariants

1. For every challenge, verify all prerequisite commitments were absorbed first
2. Confirm domain separation labels are unique for each round/context
3. Verify public input binding occurs before dependent challenge creation

## Phase 3: Multi-round and reset checks

1. Check transcript state continuity across rounds
2. Flag any transcript reset/reinit that drops required prior state
3. Ensure verifier code mirrors prover transcript logic exactly

## Phase 4: Cross-reference and handoff

- Compare with `references/finding-patterns.md`
- Check `zkbugs-index` for known transcript/challenge incidents
- Forward surviving findings to `crypto-fp-check`
