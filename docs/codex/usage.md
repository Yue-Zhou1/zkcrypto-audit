# Codex Usage Guide

This guide describes the Codex-native orchestration flow for `zkcrypto-audit`.

## Prerequisites

- Repository checked out locally.
- Python 3.10+ available for scaffolding checks.

## Codex Startup Flow

1. Verify generated compatibility stubs and metadata:

```bash
python3 scripts/sync_codex_stubs.py --check
```

2. Ensure Codex is reading:
   - `.agents/plugins/marketplace.json`
   - `plugins/*/.codex-plugin/plugin.json`
   - `plugins/*/skills/*/agents/openai.yaml`
   - `.codex/skills/*/SKILL.md`

3. Start audits router-first:

```text
Use crypto-audit-router to run a staged crypto security review.
```

## Orchestration Rules

- Source-of-truth skill behavior: `plugins/*/skills/*/SKILL.md`
- Routing policy and trigger modes: `plugins/_meta/codex-skill-registry.yaml`
- Route predicates and phase controls: `plugins/_meta/router-matrix.yaml`
- Session handoff storage: `zk-findings/sessions/*.json`
- Session schema enforcement: `zk-findings/sessions/session-state-schema.json`

`user_triggered_only` skills are never auto-selected by the router.

## Migration Summary

The previous flat Codex stub model is preserved as a compatibility layer:

- `.codex/skills/*` remains valid for skill invocation.
- Stubs are generated from the registry; they are not hand-maintained.
- Existing skill identifiers are unchanged for backward compatibility.
