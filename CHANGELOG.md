# Changelog

All notable changes to `zkcrypto-audit` are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic
Versioning.

## [Unreleased]

### Added

- Codex-native plugin packaging manifests under `plugins/*/.codex-plugin/plugin.json`.
- Codex marketplace registry and schema under `.agents/plugins/`.
- Machine-readable orchestration metadata under `plugins/_meta/`:
  - `codex-skill-registry.yaml`
  - `router-matrix.yaml`
- Codex UI/discovery metadata files for all skills under
  `plugins/*/skills/*/agents/openai.yaml`.
- Stub synchronization/check utility: `scripts/sync_codex_stubs.py`.
- Router state transition reference:
  `plugins/core-audit-flow/skills/crypto-audit-router/references/state-machine.md`.
- Codex documentation:
  - `docs/codex/architecture.md`
  - `docs/codex/usage.md`
- Codex orchestration scaffolding test suite:
  `tests/test_codex_orchestration_scaffolding.py`.

### Changed

- CI and pre-push guardrails now run
  `python3 scripts/sync_codex_stubs.py --check`.
- `.codex/skills/*` stubs are now generated from the machine-readable registry
  and remain valid backward-compatible invocation paths.
- Router documentation now references machine-readable orchestration sources and
  explicit session-state phase transitions.

## [0.3.0] - 2026-04-07

### Added

- New `ethereum-crypto-auditor` domain skill for Ethereum-focused Rust crypto
  review (ECDSA/secp256k1, keccak/EIP-712, precompiles, KZG/EIP-4844, and API
  misuse patterns).
- New `folding-scheme-auditor` domain skill for Nova/HyperNova/ProtoStar/Sonobe
  folding and IVC review.
- `zk-circuit-auditor` library-specific references for Halo2, arkworks, and
  plonky2/plonky3 pattern hunting.
- `side-channel-auditor` ZK prover-side leakage reference file
  (`zk-prover-patterns.md`).
- Codex compatibility stubs for `ethereum-crypto-auditor` and
  `folding-scheme-auditor`.

### Changed

- Expanded routing matrix coverage to include Ethereum-crypto and folding-scheme
  routes.
- Strengthened scaffolding tests to lock new skill files and routing-bullet
  references.
- Updated collection documentation to reflect 7 category plugins / 31 skills.

## [0.2.0] - 2026-04-02

### Changed

- Reorganized packaging from 29 flat plugins into 7 category plugins containing
  the same 29 skills.
- Consolidated `.claude-plugin/marketplace.json` from 29 plugin entries to 7
  category entries.
- Updated Codex compatibility stubs, CI/hook paths, and tests for the new
  category-based layout.
- Moved `zkbugs-index` scripts/config/index/data under
  `plugins/evidence-and-tooling/`.

## [0.1.0] - 2026-03-30

### Added

- Initial marketplace-ready plugin collection with 11 plugins.
- Root marketplace manifest and plugin scaffolding tests.
- `zkbugs-index` CLI tooling for indexing, querying, and promoting findings.
- Codex compatibility stubs under `.codex/skills/`.
