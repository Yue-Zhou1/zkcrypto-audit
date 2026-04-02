# TODO Roadmap

Snapshot aligned to `docs/superpowers/plans/2026-04-02-remaining-todo-gap-closure.md`.

## Phase 1: Auditor Expansion

- [x] `gnark-auditor`
- [x] `encryption-scheme-auditor`
- [x] `mpc-auditor`
- [x] `vdf-auditor`
- [x] `lattice-auditor`
- [x] `fhe-auditor`
- [x] `side-channel-auditor`
- [x] `dependency-auditor`
- [x] `formal-verification-bridge` (auxiliary, user-triggered)

## Phase 2: Index and Harness Follow-Ups

- [x] `zkbugs-index` supplemental ingestion for Trail of Bits, Zellic, and audit-contest datasets
- [x] Backfill canonical vuln taxonomy coverage: `nonce_reuse`, `arithmetic_overflow`, `missing_range_check`, `missing_nullifier`, `trusted_setup_leak`, `prover_input_injection`, `lookup_table_mismatch`, `missing_public_input`, `privacy_leak`, `subgroup_attack`, `timing_side_channel`, `configuration_error`
- [x] `kani-harness-gen` docs updated with configurable budgets (`KANI_TIMEOUT_SECONDS`) and optional lightweight fallback (`PROPTEST_CASES`)
- [x] `fuzz-harness-gen` docs updated with configurable budgets (`FUZZ_TIME_LIMIT`, `FUZZ_MAX_ITERS`) and optional lightweight fallback (`PROPTEST_CASES`)
- [x] Kani timing/constant-time claims superseded by `side-channel-auditor`

## Phase 3: Tooling, Session State, and Reporting

- [x] Add scheduled/manual `zkbugs-index` auto-rebuild workflow and CI freshness guard
- [x] Add `zk-findings/sessions/` state schema + router/context handoff contract
- [x] Add report template variants (client/internal/public-disclosure)
- [x] Sync docs (`README.md`, `CLAUDE.md`) and final plugin-count references
