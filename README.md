# zkcrypto-audit

![Claude Code](https://img.shields.io/badge/Claude_Code-plugin_collection-111827)
![Plugins](https://img.shields.io/badge/plugins-7_categories%2F29_skills-0f766e)
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

For most users, follow this 3-step setup in Claude Code.

### 1) Add the marketplace (one time)

```bash
/plugin marketplace add Yue-Zhou1/zkcrypto-audit
```

### 2) Install plugins

Open the plugin menu:

```bash
/plugin menu
```

Install these category plugins:

- `core-audit-flow` (install this first)
- `zk-and-vm-auditors`
- `crypto-primitive-auditors`
- `protocol-auditors`
- `post-quantum-auditors`
- `implementation-safety`
- `evidence-and-tooling`

This 7-plugin install provides all 29 skills, including `crypto-audit-router`,
domain auditors, and evidence tooling.

If you prefer command-based install, start with:

```bash
/plugin install core-audit-flow@zkcrypto-audit
```

### 3) Verify installation

In a new chat, ask:

```text
Use crypto-audit-router to run a staged crypto security review.
```

`crypto-audit-router` is included in `core-audit-flow` and orchestrates the
workflow. Install all 7 category plugins above for end-to-end coverage.

### Local development (this repo checked out locally)

From the repo root:

```bash
/plugin marketplace add ./
/plugin menu
```

For OpenAI Codex, this repository includes compatibility stubs under
`.codex/skills/`.

## Runtime Requirements

- Python 3.10+ is required for the `zkbugs-index` CLI scripts under
  `plugins/evidence-and-tooling/scripts/` (they use PEP 604 union syntax like
  `str | None`).
- Optional semantic search dependencies are listed in
  `plugins/evidence-and-tooling/scripts/requirements.txt`.

## Harness Runtime Controls

- `kani-harness-gen` default budget: 300 seconds per harness, configurable via
  `KANI_TIMEOUT_SECONDS`.
- `fuzz-harness-gen` defaults: 600 seconds per target (`FUZZ_TIME_LIMIT`) plus
  optional deterministic cap (`FUZZ_MAX_ITERS`).
- Optional lightweight fallback checks can be bounded with `PROPTEST_CASES`.
- Timing/constant-time validation is not a Kani guarantee; route those checks
  through `side-channel-auditor`.

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
`plugins/core-audit-flow/skills/crypto-audit-router/workflows/full-audit-flow.md`.

## Which Auditor Should I Use?

| If you are reviewing... | Start with... | Why |
| --- | --- | --- |
| an unfamiliar ZK or crypto codebase | `crypto-audit-router` | Picks the right sequence and keeps handoffs explicit |
| code that should match a paper, RFC, or protocol spec | `spec-delta-checker` | Treats implementation drift as an audit target |
| Circom, Noir, Halo2, Groth16, PLONKish, transcripts, verifiers, or recursion | `zk-circuit-auditor` | Focuses on soundness, transcript, setup, and verifier failures |
| Cairo/Starknet contracts, hints, felt252 arithmetic, and Sierra/CASM boundaries | `cairo-auditor` | Focuses on hint validation, builtin misuse, and Cairo-specific soundness risks |
| Noir unconstrained functions, oracles, Brillig/ACIR boundaries | `noir-auditor` | Focuses on unconstrained-to-constrained boundary safety and oracle binding |
| SP1, RISC Zero, Valida guest programs, precompiles, continuation proofs | `zkvm-auditor` | Focuses on guest-host boundaries, memory consistency, and runtime soundness |
| Poseidon, Rescue, MiMC, Pedersen parameterization and sponge usage | `hash-function-auditor` | Focuses on hash-primitive assumptions, domain separation, and algebraic resistance |
| KZG, FRI, IPA commitment verification and opening checks | `commitment-scheme-auditor` | Focuses on degree bounds, opening verification, and setup integrity |
| Merkle inclusion/sparse proofs and root update logic | `merkle-tree-auditor` | Focuses on domain separation, path validation, and second-preimage risks |
| Fiat-Shamir transcript transforms and challenge derivation | `fiat-shamir-auditor` | Focuses on transcript completeness, binding order, and context separation |
| elliptic-curve arithmetic, pairings, BLS aggregation, DST, subgroup, or batch verification | `ecc-pairing-auditor` | Focuses on curve, encoding, pairing, and batch-validation bugs |
| DKG, FROST, MuSig2, nonce handling, share validation, or session isolation | `dkg-threshold-auditor` | Focuses on threshold-protocol state and authentication failures |
| gnark frontend/backend constraints, Go witness assignment, or witness visibility | `gnark-auditor` | Focuses on gnark API/constraint alignment and serialization boundaries |
| AEAD nonce handling, decrypt oracles, associated-data binding, or KDF misuse | `encryption-scheme-auditor` | Focuses on authenticated-encryption misuse and decrypt-path side effects |
| MPC transcripts, OT role binding, share validation, or Beaver preprocessing | `mpc-auditor` | Focuses on multi-party phase isolation and reconstruction safety |
| VDF sequentiality, challenge derivation, or verifier exponent checks | `vdf-auditor` | Focuses on delay-proof soundness and setup assumptions |
| LWE/RLWE parameters, noise sampling, rejection sampling, or failure bounds | `lattice-auditor` | Focuses on post-quantum parameter/sampling integrity |
| FHE noise budgets, bootstrapping, modulus/key switching, or plaintext leakage | `fhe-auditor` | Focuses on homomorphic transform lifecycle correctness |
| timing/cache/power leakage and constant-time regressions | `side-channel-auditor` | Focuses on secret-dependent control/data-flow leakage |
| crypto dependency advisories, feature-flag semantics, or fork provenance | `dependency-auditor` | Focuses on supply-chain risk in cryptographic stacks |
| Rust crypto code with timing, zeroization, `unsafe`, panic, overflow, or dependency risk | `rust-crypto-safety` | Focuses on implementation-level safety hazards in Rust |
| Optional formal proof harness generation on Rust crypto targets | `kani-harness-gen` | User-triggered Kani harness generation for property-level evidence |
| Optional crash/edge-case fuzzing of Rust crypto APIs | `fuzz-harness-gen` | User-triggered cargo-fuzz target generation and crash triage |

## What's Inside

The repository ships 7 category plugins that contain 29 total skills:

- `plugins/core-audit-flow`
  Skills: `crypto-audit-router`, `audit-common`, `crypto-audit-context`,
  `spec-delta-checker`, `crypto-fp-check`, `crypto-report-writer`.
- `plugins/zk-and-vm-auditors`
  Skills: `zk-circuit-auditor`, `cairo-auditor`, `noir-auditor`,
  `zkvm-auditor`, `gnark-auditor`.
- `plugins/crypto-primitive-auditors`
  Skills: `ecc-pairing-auditor`, `hash-function-auditor`,
  `commitment-scheme-auditor`, `merkle-tree-auditor`, `fiat-shamir-auditor`,
  `encryption-scheme-auditor`.
- `plugins/protocol-auditors`
  Skills: `dkg-threshold-auditor`, `mpc-auditor`, `vdf-auditor`.
- `plugins/post-quantum-auditors`
  Skills: `lattice-auditor`, `fhe-auditor`.
- `plugins/implementation-safety`
  Skills: `rust-crypto-safety`, `side-channel-auditor`, `dependency-auditor`.
- `plugins/evidence-and-tooling`
  Skills: `zkbugs-index`, `kani-harness-gen`, `fuzz-harness-gen`,
  `formal-verification-bridge`.
  Includes: `scripts/`, `config/`, `index/`, and `data/` for zkbugs index
  build/query workflows.
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

## Current Status

- The repository currently ships as 7 category plugins under `plugins/`,
  containing 29 total skills.
- The repository root now exposes a Claude Code marketplace catalog at
  `.claude-plugin/marketplace.json`.
- Each category plugin has its own `.claude-plugin/plugin.json` and multi-skill
  content under `skills/`.
- Codex compatibility stubs exist under `.codex/skills/` and mirror the plugin
  skill names.
- The root README is the entry point for the collection and its marketplace
  install flow.

## Versioning

This project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).

- Patch: wording updates, references, and low-risk fixes.
- Minor: new skills, workflow expansions, or backward-compatible contract additions.
- Major: breaking changes to workflow contracts or expected output structure.

Release notes for each published version are tracked in `CHANGELOG.md`.

## Contributing

Contributions should preserve the staged workflow of the framework: focused
plugins, explicit references and workflows, and tests that lock down key
contracts. If you change plugin structure or installation guidance, update the
README and the scaffolding tests together.

## Acknowledgments

This project draws ideas from [trailofbits/skills](https://github.com/trailofbits/skills), especially around structured audit workflows and skill organization.

This project is also partially based on publicly documented ZK vulnerability references from [zksecurity/zkbugs](https://github.com/zksecurity/zkbugs), which informed parts of the findings/indexing approach.

This repository is an independent project and is not affiliated with or endorsed by Trail of Bits or zkSecurity.
