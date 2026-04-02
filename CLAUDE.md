# zkcrypto-audit

`zkcrypto-audit` is a plugin collection for staged, evidence-driven audits of
zero-knowledge systems and cryptographic protocols.

## Project Layout

- `plugins/` contains the 20 published plugins and skill content.
- `.claude-plugin/marketplace.json` is the root marketplace manifest.
- `.codex/skills/` contains Codex discovery stubs pointing to canonical skills.
- `tests/` contains scaffolding and CLI regression tests.

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
python3 -m unittest discover -s tests -q
python3 -m py_compile \
  plugins/zkbugs-index/scripts/_shared.py \
  plugins/zkbugs-index/scripts/build_index.py \
  plugins/zkbugs-index/scripts/contribute_bug.py \
  tests/test_crypto_audit_plugin_scaffolding.py \
  tests/test_zkbugs_index_cli.py
```
