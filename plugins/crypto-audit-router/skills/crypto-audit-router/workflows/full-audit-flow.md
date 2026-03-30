# Full Audit Flow

Follow this end-to-end flow unless the current target clearly skips a phase.

## Phase 1: Intake

- Start with `crypto-audit-context`
- Capture the context handoff before moving on

## Phase 2: Select domain review

- Use `spec-delta-checker` whenever a reference specification or paper governs the code
- Route to one or more domain skills: `ecc-pairing-auditor`, `zk-circuit-auditor`, `dkg-threshold-auditor`, `rust-crypto-safety`
- Preserve each domain skill's output contract instead of flattening everything into prose

## Phase 3: Verification

- Send surviving suspected findings to `crypto-fp-check`
- Drop or downgrade claims that fail the verification gates

## Phase 4: Reporting and indexing

- Send verified findings to `crypto-report-writer`
- Use `zkbugs-index` only for prior-art lookup or for verified, index-worthy findings

## Phase 5: Closeout

- Ensure the final report, index entry, and cited prior art all reflect the same verified claim set
- If outputs disagree, return to the earliest phase where the artifact drift began
