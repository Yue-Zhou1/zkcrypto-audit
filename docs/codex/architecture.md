# Packaging Architecture

How the skills in this repository reach Claude Code, Codex, and other agents.

## Sources of truth

| Path | Owns |
|---|---|
| `plugins/*/skills/*/SKILL.md` and the files beside it | Skill behaviour. Each skill directory is self-contained and follows the Agent Skills spec |
| `plugins/core-audit-flow/skills/crypto-audit-router/references/routing-matrix.md` | Routing policy: flow skills, situation routes, and user-triggered skills |
| `plugins/core-audit-flow/skills/crypto-audit-router/workflows/full-audit-flow.md` | The staged flow and its completion contract |
| `plugins/core-audit-flow/skills/crypto-audit-router/references/session-state-schema.json` | Session state shape |
| `.claude-plugin/marketplace.json` | Plugin list, descriptions, author, and the single version number |

## Generated layers

`scripts/sync.py` writes the files below from the sources above.
`scripts/sync.py --check` fails when one is stale.

| Path | Consumer | Derived from |
|---|---|---|
| `plugins/*/.claude-plugin/plugin.json` | Claude Code | marketplace entry |
| `plugins/*/.codex-plugin/plugin.json` | Codex plugin loader | marketplace entry and metadata |
| `.agents/plugins/marketplace.json` | Codex marketplace | marketplace plugin list |
| `plugins/*/skills/*/agents/openai.yaml` | Codex skill UI metadata (`interface.*`) | `SKILL.md` frontmatter |

## Routing

The router skill reads its own `references/routing-matrix.md`, which lists:

- flow skills that run in every audit,
- situation routes that select domain auditors,
- user-triggered skills the router must never select on its own.

`agents/openai.yaml` and the plugin manifests carry discovery metadata only.

## Portability rules

- A skill references only files inside its own directory.
- Skills refer to each other by name.
- Frontmatter is limited to the Agent Skills spec fields.

## Audit workspace

The flow writes to `.zkcrypto-audit/<engagement-id>/` in the directory the
audit is run from. `workflows/full-audit-flow.md` defines the layout.
