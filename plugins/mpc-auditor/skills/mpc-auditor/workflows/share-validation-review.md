# Share Validation Review Workflow

Step-by-step review for MPC share integrity and session-bound protocol execution.

## Phase 1: Enumerate protocol phases

1. Map setup, offline, and online stages for each participant role
2. Record artifacts produced in each stage (shares, triples, transcripts)
3. Identify all transition points between offline and online execution

## Phase 2: Validate share handling

1. Trace each share from receipt/generation to reconstruction use
2. Verify MAC/commitment checks execute before any share consumption
3. Confirm threshold and participant-set checks gate reconstruction logic

## Phase 3: Transcript and role binding

1. Verify transcript/session identifiers are unique per round
2. Check message handlers enforce sender/receiver role expectations
3. Ensure replayed or cross-session messages are rejected deterministically

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
