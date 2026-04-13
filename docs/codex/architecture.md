# Codex Orchestration Architecture

This document defines the Codex-native packaging and orchestration contract for
`zkcrypto-audit`.

## Canonical Sources and Ownership

| Path | Owner role | Notes |
|---|---|---|
| `plugins/*/skills/*/SKILL.md` | Canonical skill behavior | Source of truth for prompts, workflow, and references. |
| `.agents/plugins/marketplace.json` | Codex plugin catalog | Declares which category plugins Codex can discover and load. |
| `.agents/plugins/marketplace.schema.json` | Marketplace contract | Validates marketplace shape and required fields. |
| `plugins/_meta/codex-skill-registry.yaml` | Orchestration registry | Canonical machine-readable skill routing metadata (`phase`, `trigger_mode`, canonical path). |
| `plugins/_meta/router-matrix.yaml` | Route matrix source | Canonical machine-readable route predicates and target skills. |
| `plugins/*/.codex-plugin/plugin.json` | Codex plugin packaging | Packaging metadata for each category plugin. |
| `plugins/*/skills/*/agents/openai.yaml` | Codex UI/discovery metadata | Discoverability metadata only; not routing authority. |
| `.codex/skills/*/SKILL.md` | Generated compatibility layer | Generated from registry; never hand-edited. |
| `plugins/*/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json` | Claude packaging | Retained for Claude Code plugin distribution. |

## Router-First Execution Contract

The default audit flow is router-first:

1. `crypto-audit-router` chooses phase ordering and required skills.
2. Intake/domain/verification/reporting/indexing handoffs are persisted in
   `zk-findings/sessions`.
3. Skills marked `trigger_mode: router_auto` are eligible for automatic router
   selection when predicates match.
4. Skills marked `trigger_mode: user_triggered_only` must never be auto-routed;
   they run only when explicitly requested by the user/operator.

Routing policy is defined in `plugins/_meta/codex-skill-registry.yaml` and
`plugins/_meta/router-matrix.yaml`, not in per-skill UI metadata.

## Why Dual Packaging Exists

Two packaging systems are intentionally maintained:

- Claude packaging:
  - `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
- Codex packaging:
  - `plugins/*/.codex-plugin/plugin.json`
  - `.agents/plugins/marketplace.json`
  - `plugins/*/skills/*/agents/openai.yaml`

Responsibility split:

- `agents/openai.yaml` contains Codex discoverability/UI fields only.
- `.codex-plugin/plugin.json` contains Codex plugin packaging metadata only.
- Routing authority (`phase`, `trigger_mode`, predicates) remains in
  `plugins/_meta/*.yaml`.

## Migration Policy

- Existing skill identifiers are stable and must not be renamed in a
  backward-incompatible way.
- Existing Codex invocation paths (`.codex/skills/<skill-name>/SKILL.md`)
  remain valid compatibility entry points.
- Any canonical skill content updates must happen in
  `plugins/*/skills/*/SKILL.md`; generated layers are updated via generator.

## Codex Marketplace Shape

`.agents/plugins/marketplace.json` must declare:

- `$schema`: relative reference to `.agents/plugins/marketplace.schema.json`
- `version`: marketplace contract version for this repository
- `plugins`: deterministic ordered list of the seven category plugins

Each plugin entry must include:

- `name`
- `category`
- `policy`
- `source`
- `manifest`

`marketplace.schema.json` is the contract-of-record for required fields, enum
values, and structural validation used by tests and CI.
