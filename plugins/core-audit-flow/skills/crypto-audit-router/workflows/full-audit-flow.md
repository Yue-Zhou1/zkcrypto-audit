# Full Audit Flow

Follow this end-to-end flow unless the current target clearly skips a phase.
Maintain a local session state file at every handoff boundary:
`zk-findings/sessions/<engagement-id>.json`.

State transitions and mutation boundaries are defined in
`../references/state-machine.md`.

## Phase 1: Intake

- Start with `crypto-audit-context`
- Capture the context handoff before moving on
- Persist intake outputs, trust boundaries, and target scope into session state
- **Stop condition:** session state includes schema-required `engagement_id`,
  `targets`, `trust_boundaries`, `open_findings`, `verified_findings`, and `next_steps`
- **Escalation:** if context fields are incomplete or schema-invalid, return to
  `crypto-audit-context` before entering domain review

## Phase 2: Select domain review

- Use `spec-delta-checker` whenever a reference specification or paper governs the code
- Consult `references/routing-matrix.md` to select the applicable domain skill(s); multiple may apply in parallel
<!-- BEGIN GENERATED DOMAIN SKILLS -->
- **ZK and VM auditors**: `zk-circuit-auditor`, `cairo-auditor`, `noir-auditor`, `zkvm-auditor`, `gnark-auditor`, `folding-scheme-auditor`, `onchain-verifier-auditor`
- **Crypto primitive auditors**: `ecc-pairing-auditor`, `commitment-scheme-auditor`, `hash-function-auditor`, `fiat-shamir-auditor`, `merkle-tree-auditor`, `encryption-scheme-auditor`, `ethereum-crypto-auditor`, `signature-scheme-auditor`
- **Protocol auditors**: `dkg-threshold-auditor`, `mpc-auditor`, `vdf-auditor`, `threshold-ecdsa-auditor`, `privacy-protocol-auditor`, `vrf-auditor`
- **Post-quantum auditors**: `lattice-auditor`, `fhe-auditor`, `pqc-kem-auditor`, `pqc-signature-auditor`
- **Implementation safety**: `rust-crypto-safety`, `side-channel-auditor`, `dependency-auditor`, `randomness-auditor`, `fault-injection-auditor`
<!-- END GENERATED DOMAIN SKILLS -->
- Preserve each domain skill's output contract instead of flattening everything into prose
- Append open findings and unresolved assumptions to session state after each domain handoff
- **Stop condition:** domain output contracts are recorded and unresolved issues
  are represented in `open_findings`
- **Escalation:** if findings cannot be reproduced or assumptions are unresolved,
  continue domain routing instead of progressing to verification

## Phase 3: Verification

- Send surviving suspected findings to `crypto-fp-check`
- Drop or downgrade claims that fail the verification gates
- Promote surviving items from `open_findings` to `verified_findings` in session state
- **Stop condition:** every promoted item has verification evidence and
  non-surviving items are explicitly resolved
- **Escalation:** if evidence quality is insufficient, return to the originating
  domain auditor and re-run with explicit reproduction requirements

## Phase 4: Reporting and indexing

- Send verified findings to `crypto-report-writer`
- Use `zkbugs-index` only for prior-art lookup or for verified, index-worthy findings
- Optionally trigger `kani-harness-gen`, `fuzz-harness-gen`, `formal-verification-bridge`, or `differential-test-harness-gen` for findings that benefit from machine-checked or differential evidence (user-triggered only)
- Record report/index references in session state and refresh `next_steps`
- **Stop condition:** each verified finding has consistent report evidence, and
  any indexing action references the same verified claim set
- **Escalation:** if report text diverges from verified evidence, return to
  verification before indexing

## Phase 5: Closeout

- Ensure the final report, index entry, and cited prior art all reflect the same verified claim set
- If outputs disagree, return to the earliest phase where the artifact drift began
- Confirm session state captures final handoff status for future conversations
- **Stop condition:** session state is schema-valid and all required handoff
  artifacts are internally consistent
