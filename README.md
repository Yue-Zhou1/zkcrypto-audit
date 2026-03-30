# zkcrypto-audit

![Claude Code](https://img.shields.io/badge/Claude_Code-plugin_collection-111827)
![Plugins](https://img.shields.io/badge/plugins-11-0f766e)
![Focus](https://img.shields.io/badge/focus-ZK_%2B_crypto-1d4ed8)
![Method](https://img.shields.io/badge/method-evidence_driven-b45309)

A staged audit stack for zero-knowledge systems and cryptographic protocols.

`zkcrypto-audit` is a plugin collection for running staged, evidence-driven
crypto reviews instead of collapsing everything into one monolithic prompt. It
breaks the job into focused phases: build audit context, check spec drift, run
domain-specific review, verify suspected findings, write report-ready output,
and look up prior art.

The guiding rule across the repository is simple: verify what the code actually
enforces, not what the docs claim.

## Usage Guardrails

> These agentic skills are a structured guide for crypto/security reviews, not an autonomous decision-maker.  
> Do not rely on them blindly or deliver raw output directly to clients.  
> Final findings, severity ratings, and client reports must be produced through independent professional security judgment.

## Why This Exists

Security reviews of ZK and cryptographic systems usually mix several different
jobs:

- understanding trust boundaries and protocol scope
- comparing code against papers or reference specs
- reviewing domain-specific logic such as circuits, pairings, or threshold flows
- filtering false positives before reporting
- turning surviving findings into report-ready evidence

This repository separates those jobs into composable plugins with explicit
handoff artifacts. That makes the workflow easier to route, easier to verify,
and less likely to drift into vague "looks suspicious" output.

## Installation

This repository is a **plugin collection** of sibling plugins under `plugins/`,
not a single root plugin. It now also ships a root
`.claude-plugin/marketplace.json`, so Claude Code can add the repository as one
marketplace while still installing individual plugins from `plugins/`.
For OpenAI Codex discovery, the repository also ships flat compatibility stubs
under `.codex/skills/` that point to each canonical plugin skill.

For local development from the repo root:

```bash
/plugin marketplace add ./
/plugin install crypto-audit-router@zkcrypto-audit
```

After publishing the repository on GitHub:

```bash
/plugin marketplace add <owner>/<repo>
/plugin install crypto-audit-router@zkcrypto-audit
```

For the default end-to-end workflow, install at least:

- `plugins/crypto-audit-router`
- `plugins/audit-common`
- `plugins/crypto-audit-context`
- `plugins/spec-delta-checker`
- one or more domain auditors under `plugins/`
- `plugins/crypto-fp-check`
- `plugins/crypto-report-writer`
- `plugins/zkbugs-index`

`crypto-audit-router` is the top-level router plugin and is designed to route
across those sibling plugins, so the stack works best when they are available
together.

## Runtime Requirements

- Python 3.10+ is required for the `zkbugs-index` CLI scripts under
  `plugins/zkbugs-index/scripts/` (they use PEP 604 union syntax like
  `str | None`).
- Optional semantic search dependencies are listed in
  `plugins/zkbugs-index/scripts/requirements.txt`.

## How It Works

The intended default audit flow is:

1. `crypto-audit-router`
2. `crypto-audit-context`
3. `spec-delta-checker` when a governing spec or paper exists
4. one or more domain auditors
5. `crypto-fp-check`
6. `crypto-report-writer`
7. `zkbugs-index` for prior-art lookup or verified entry storage

The canonical workflow is documented in
`plugins/crypto-audit-router/skills/crypto-audit-router/workflows/full-audit-flow.md`.

## Which Auditor Should I Use?

| If you are reviewing... | Start with... | Why |
| --- | --- | --- |
| an unfamiliar ZK or crypto codebase | `crypto-audit-router` | Picks the right sequence and keeps handoffs explicit |
| code that should match a paper, RFC, or protocol spec | `spec-delta-checker` | Treats implementation drift as an audit target |
| Circom, Noir, Halo2, Groth16, PLONKish, transcripts, verifiers, or recursion | `zk-circuit-auditor` | Focuses on soundness, transcript, setup, and verifier failures |
| elliptic-curve arithmetic, pairings, BLS aggregation, DST, subgroup, or batch verification | `ecc-pairing-auditor` | Focuses on curve, encoding, pairing, and batch-validation bugs |
| DKG, FROST, MuSig2, nonce handling, share validation, or session isolation | `dkg-threshold-auditor` | Focuses on threshold-protocol state and authentication failures |
| Rust crypto code with timing, zeroization, `unsafe`, panic, overflow, or dependency risk | `rust-crypto-safety` | Focuses on implementation-level safety hazards in Rust |

## What's Inside

### Shared Foundation

- `plugins/audit-common`
  Shared severity model, testing-evidence checklist, and finding contract.
- `plugins/crypto-audit-context`
  Builds audit context, trust-boundary maps, dimensional analysis, and review
  priority.
- `plugins/spec-delta-checker`
  Treats implementation drift from papers or reference specs as a first-class
  audit target.
- `plugins/crypto-fp-check`
  Applies verification gates and enforces evidence discipline before a finding
  becomes reportable.
- `plugins/crypto-report-writer`
  Turns verified findings into report-ready prose with consistent evidence
  framing.

### Domain Auditors

- `plugins/zk-circuit-auditor`
  Reviews ZK circuits, transcripts, verifier logic, setup assumptions, batching,
  and recursion paths.
- `plugins/ecc-pairing-auditor`
  Reviews elliptic-curve, pairing, and BLS code for point validation, subgroup,
  DST, cofactor, and batch-verification bugs.
- `plugins/dkg-threshold-auditor`
  Reviews DKG and threshold-signature flows for rogue-key, nonce-binding,
  share-verification, reconstruction, and session-isolation bugs.
- `plugins/rust-crypto-safety`
  Reviews constant-time behavior, zeroization, `unsafe`, overflow, panic, and
  dependency hygiene in Rust crypto code.

### Orchestration and Indexing

- `plugins/crypto-audit-router`
  Chooses the audit sequence and preserves handoffs between phases.
- `plugins/zkbugs-index`
  Stores and queries prior art and local findings for reuse during ZK reviews.
- `zk-findings/`
  Local workspace for organization findings during development. Keep
  engagement-specific data here and out of versioned plugin content.

## Design Principles

- Verify code, not documentation.
- Keep phase boundaries explicit with stable output contracts.
- Treat spec drift as an audit target, not background context.
- Require verification before reporting.
- Keep Critical and High findings tied to strong evidence, including PoC support
  where required by the workflow.

## Verification

The repository currently uses focused Python tests to pin plugin scaffolding,
README expectations, and `zkbugs-index` behavior:

- `tests/test_crypto_audit_plugin_scaffolding.py`
- `tests/test_zkbugs_index_cli.py`

Typical verification commands:

```bash
python3 -m unittest -v \
  tests.test_zkbugs_index_cli \
  tests.test_crypto_audit_plugin_scaffolding

python3 -m py_compile \
  plugins/zkbugs-index/scripts/_shared.py \
  plugins/zkbugs-index/scripts/build_index.py \
  plugins/zkbugs-index/scripts/query_index.py \
  plugins/zkbugs-index/scripts/contribute_bug.py \
  tests/test_zkbugs_index_cli.py \
  tests/test_crypto_audit_plugin_scaffolding.py
```

To enable the repository-managed pre-push guard locally:

```bash
git config core.hooksPath .githooks
```

This runs the same unittest and compile checks before each push.

Releases can be published either by pushing a `v*` tag or by running the
`Release` workflow manually via GitHub Actions (`workflow_dispatch`).
The release workflow uses `CHANGELOG.md` as the source of truth for release
notes and fails if the target version section is missing or empty.

## Current Status

- The repository currently ships as a collection of individual plugins under
  `plugins/`.
- The repository root now exposes a Claude Code marketplace catalog at
  `.claude-plugin/marketplace.json`.
- Each plugin has its own `.claude-plugin/plugin.json` and skill content.
- Codex compatibility stubs exist under `.codex/skills/` and mirror the plugin
  skill names.
- The root README is the entry point for the collection and its marketplace
  install flow.

## Versioning

This collection follows Semantic Versioning for plugin manifests and marketplace
metadata.

- Patch (`x.y.Z`): wording, references, and low-risk fixes that do not change
  workflow contracts.
- Minor (`x.Y.z`): new skills, new workflow steps, or schema-compatible
  contract additions.
- Major (`X.y.z`): breaking workflow/output-contract changes.

Release notes are tracked in `CHANGELOG.md`.

## Contributing

Contributions should preserve the staged workflow of the framework: focused
plugins, explicit references and workflows, and tests that lock down key
contracts. If you change plugin structure or installation guidance, update the
README and the scaffolding tests together.

## Acknowledgments

This project draws ideas from [trailofbits/skills](https://github.com/trailofbits/skills), especially around structured audit workflows and skill organization.

This project is also partially based on publicly documented ZK vulnerability references from [zksecurity/zkbugs](https://github.com/zksecurity/zkbugs), which informed parts of the findings/indexing approach.

This repository is an independent project and is not affiliated with or endorsed by Trail of Bits or zkSecurity.
