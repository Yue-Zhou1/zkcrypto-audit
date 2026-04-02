# Changelog

All notable changes to `zkcrypto-audit` are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic
Versioning.

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
