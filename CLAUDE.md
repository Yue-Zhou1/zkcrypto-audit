# zkcrypto-audit

`zkcrypto-audit` is a plugin collection for staged, evidence-driven audits of
zero-knowledge systems and cryptographic protocols.

## Project Layout

- `plugins/` contains 7 category plugins housing 31 audit skills.
- `.claude-plugin/marketplace.json` is the root marketplace manifest.
- `.agents/plugins/marketplace.json` is the Codex marketplace catalog.
- `.agents/plugins/marketplace.schema.json` validates Codex marketplace structure.
- `plugins/*/.codex-plugin/plugin.json` contains Codex plugin manifests.
- `plugins/_meta/codex-skill-registry.yaml` is the routing policy source of truth.
- `plugins/_meta/router-matrix.yaml` is the machine-readable route matrix.
- `.codex/skills/` contains generated Codex compatibility stubs.
- `tests/` contains scaffolding and CLI regression tests.
- `zk-findings/sessions/` stores local engagement session-state handoff files.

## Default Audit Flow

1. `crypto-audit-router`
2. `crypto-audit-context`
3. `spec-delta-checker`
4. Domain auditor(s)
5. `crypto-fp-check`
6. `crypto-report-writer`
7. `zkbugs-index`

## Verification Commands

```bash
python3 scripts/sync_codex_stubs.py --check
python3 -m unittest discover -s tests -q
python3 -m py_compile \
  scripts/sync_codex_stubs.py \
  plugins/evidence-and-tooling/scripts/_shared.py \
  plugins/evidence-and-tooling/scripts/build_index.py \
  plugins/evidence-and-tooling/scripts/contribute_bug.py \
  tests/test_crypto_audit_plugin_scaffolding.py \
  tests/test_codex_orchestration_scaffolding.py \
  tests/test_sync_codex_stubs.py \
  tests/test_zkbugs_index_cli.py
```
