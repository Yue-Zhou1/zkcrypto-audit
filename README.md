# zkcrypto-audit

![Claude Code](https://img.shields.io/badge/Claude_Code-plugin_collection-111827)
![Plugins](https://img.shields.io/badge/plugins-29-0f766e)
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

Install these plugins:

- `crypto-audit-router` (install this first)
- `audit-common`
- `crypto-audit-context`
- `spec-delta-checker`
- at least one domain auditor (choose one or more): `zk-circuit-auditor`,
  `cairo-auditor`, `noir-auditor`, `zkvm-auditor`, `hash-function-auditor`,
  `commitment-scheme-auditor`, `merkle-tree-auditor`,
  `fiat-shamir-auditor`, `ecc-pairing-auditor`, `dkg-threshold-auditor`,
  `gnark-auditor`, `encryption-scheme-auditor`, `mpc-auditor`,
  `vdf-auditor`, `lattice-auditor`, `fhe-auditor`,
  `side-channel-auditor`, `dependency-auditor`, or `rust-crypto-safety`
- `crypto-fp-check`
- `crypto-report-writer`
- `zkbugs-index`
- optional user-triggered proving/fuzz helpers: `kani-harness-gen`,
  `fuzz-harness-gen`

If you prefer command-based install, start with:

```bash
/plugin install crypto-audit-router@zkcrypto-audit
```

### 3) Verify installation

In a new chat, ask:

```text
Use crypto-audit-router to run a staged crypto security review.
```

`crypto-audit-router` orchestrates the workflow but does not auto-install
sibling plugins. Install the full list above for end-to-end coverage.

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
  `plugins/zkbugs-index/scripts/` (they use PEP 604 union syntax like
  `str | None`).
- Optional semantic search dependencies are listed in
  `plugins/zkbugs-index/scripts/requirements.txt`.

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
`plugins/crypto-audit-router/skills/crypto-audit-router/workflows/full-audit-flow.md`.

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
- `plugins/cairo-auditor`
  Reviews Cairo/Starknet hints, felt252 arithmetic, builtin usage, and
  Sierra/CASM soundness boundaries.
- `plugins/noir-auditor`
  Reviews Noir unconstrained-function boundaries, oracle binding, Brillig/ACIR
  consistency, and witness-generation safety.
- `plugins/zkvm-auditor`
  Reviews zkVM guest programs for precompile safety, memory consistency,
  continuation proof soundness, and guest-host boundary checks.
- `plugins/hash-function-auditor`
  Reviews ZK-friendly hash function parameterization, sponge construction,
  domain separation, and algebraic attack resistance assumptions.
- `plugins/commitment-scheme-auditor`
  Reviews commitment schemes (KZG/FRI/IPA/Pedersen) for degree bounds,
  opening-proof verification, and setup/batch-soundness assumptions.
- `plugins/merkle-tree-auditor`
  Reviews Merkle tree implementations for domain separation, sparse-tree
  edge cases, and proof verification integrity.
- `plugins/fiat-shamir-auditor`
  Reviews Fiat-Shamir transforms for transcript completeness, challenge order,
  and public-input/context binding.
- `plugins/ecc-pairing-auditor`
  Reviews elliptic-curve, pairing, and BLS code for point validation, subgroup,
  DST, cofactor, and batch-verification bugs.
- `plugins/dkg-threshold-auditor`
  Reviews DKG and threshold-signature flows for rogue-key, nonce-binding,
  share-verification, reconstruction, and session-isolation bugs.
- `plugins/gnark-auditor`
  Reviews gnark frontend/backend constraint alignment, witness visibility,
  serialization boundaries, and API misuse risk.
- `plugins/encryption-scheme-auditor`
  Reviews AEAD nonce handling, decrypt-oracle behavior, AD binding, and KDF
  misuse patterns in encryption implementations.
- `plugins/mpc-auditor`
  Reviews MPC setup/offline/online flows, transcript binding, OT correctness,
  share verification, and reconstruction thresholds.
- `plugins/vdf-auditor`
  Reviews VDF sequentiality assumptions, challenge derivation, verifier
  equations, and modulus/setup integrity.
- `plugins/lattice-auditor`
  Reviews lattice parameter provenance, noise/rejection sampling correctness,
  and decryption-failure assumptions.
- `plugins/fhe-auditor`
  Reviews FHE noise budgets, bootstrapping correctness, modulus switching,
  key-switch integrity, and plaintext leakage boundaries.
- `plugins/side-channel-auditor`
  Reviews timing/cache/memory/power leakage vectors and constant-time
  regressions.
- `plugins/dependency-auditor`
  Reviews crypto dependency versions, advisory coverage, feature-flag
  semantics, transitive risk, and fork provenance.
- `plugins/rust-crypto-safety`
  Reviews constant-time behavior, zeroization, `unsafe`, overflow, panic, and
  dependency hygiene in Rust crypto code.

### Orchestration and Indexing

- `plugins/crypto-audit-router`
  Chooses the audit sequence and preserves handoffs between phases.
- `plugins/zkbugs-index`
  Stores and queries prior art and local findings for reuse during ZK reviews.
- `plugins/kani-harness-gen`
  User-triggered Kani harness generator for formal property checking in Rust
  crypto code.
- `plugins/fuzz-harness-gen`
  User-triggered cargo-fuzz target generator for crash and edge-case discovery
  in Rust crypto APIs.
- `plugins/formal-verification-bridge`
  User-triggered bridge for exporting verified findings into external formal
  tools such as Ecne, Picus, and Circomspect.
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
