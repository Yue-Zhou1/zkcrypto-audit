# Full Audit Flow

Follow this end-to-end flow unless the current target clearly skips a phase.
Maintain a local session state file at every handoff boundary:
`zk-findings/sessions/<engagement-id>.json`.

## Phase 1: Intake

- Start with `crypto-audit-context`
- Capture the context handoff before moving on
- Persist intake outputs, trust boundaries, and target scope into session state

## Phase 2: Select domain review

- Use `spec-delta-checker` whenever a reference specification or paper governs the code
- Consult `references/routing-matrix.md` to select the applicable domain skill(s); multiple may apply in parallel
- **ZK and VM auditors**: `zk-circuit-auditor`, `cairo-auditor`, `noir-auditor`, `zkvm-auditor`, `gnark-auditor`, `folding-scheme-auditor`
- **Crypto primitive auditors**: `ecc-pairing-auditor`, `commitment-scheme-auditor`, `hash-function-auditor`, `fiat-shamir-auditor`, `merkle-tree-auditor`, `encryption-scheme-auditor`, `ethereum-crypto-auditor`
- **Protocol auditors**: `dkg-threshold-auditor`, `mpc-auditor`, `vdf-auditor`
- **Post-quantum auditors**: `lattice-auditor`, `fhe-auditor`
- **Implementation safety**: `rust-crypto-safety`, `side-channel-auditor`, `dependency-auditor`
- Preserve each domain skill's output contract instead of flattening everything into prose
- Append open findings and unresolved assumptions to session state after each domain handoff

## Phase 3: Verification

- Send surviving suspected findings to `crypto-fp-check`
- Drop or downgrade claims that fail the verification gates
- Promote surviving items from `open_findings` to `verified_findings` in session state

## Phase 4: Reporting and indexing

- Send verified findings to `crypto-report-writer`
- Use `zkbugs-index` only for prior-art lookup or for verified, index-worthy findings
- Optionally trigger `kani-harness-gen`, `fuzz-harness-gen`, or `formal-verification-bridge` for findings that benefit from machine-checked evidence (user-triggered only)
- Record report/index references in session state and refresh `next_steps`

## Phase 5: Closeout

- Ensure the final report, index entry, and cited prior art all reflect the same verified claim set
- If outputs disagree, return to the earliest phase where the artifact drift began
- Confirm session state captures final handoff status for future conversations
