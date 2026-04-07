# zkcrypto-audit

![zkcrypto-audit banner](assets/banner.png)

![Claude Code](https://img.shields.io/badge/Claude_Code-plugin_collection-111827)
![Plugins](https://img.shields.io/badge/plugins-7_categories%2F31_skills-0f766e)
![Focus](https://img.shields.io/badge/focus-ZK_%2B_crypto-1d4ed8)
![Method](https://img.shields.io/badge/method-evidence_driven-b45309)

A guided audit toolkit, plugin collection, and staged security review workflow
for zero-knowledge systems and cryptographic protocols.

Instead of forcing every review into one large prompt, `zkcrypto-audit` breaks
the work into clear steps: understand the system, compare code to its governing
spec, run the right auditors, verify suspected issues, and turn the result into
report-ready evidence.

## Usage Guardrails

> **Important**
>
> This repository is designed to support human-in-the-loop crypto and security review.
> It should not be treated as an autonomous decision-maker.
> Raw model output should not be delivered directly to clients or reused as
> final findings without independent verification.
> Final judgments, severity ratings, and reports remain the responsibility of
> the human reviewer.

## Why This Exists

Crypto and ZK reviews usually mix several different jobs at once: scoping, spec
comparison, domain review, false-positive filtering, and reporting. When those
jobs are blended together, the output becomes harder to trust and harder to
reuse. This repository separates those jobs into focused plugins and skills with clear
handoffs. The goal is simple: make reviews easier to start, easier to follow,
and easier to verify.

## Installation

### Quick Start in Claude Code

1. Add the marketplace:

```bash
/plugin marketplace add Yue-Zhou1/zkcrypto-audit
```

2. Open the plugin menu:

```bash
/plugin menu
```

Install `core-audit-flow` first. Then install the categories you need, or
install all 7 plugins for full coverage:

- `core-audit-flow`
- `zk-and-vm-auditors`
- `crypto-primitive-auditors`
- `protocol-auditors`
- `post-quantum-auditors`
- `implementation-safety`
- `evidence-and-tooling`

3. Start your first audit chat:

```text
Use crypto-audit-router to run a staged crypto security review.
```

### What You Get After Install

- A guided starting point through `crypto-audit-router`
- A staged workflow for context, spec review, domain analysis, verification,
  and reporting
- 7 plugin categories covering 31 skills across ZK systems, cryptographic
  primitives, protocols, implementation safety, and evidence tooling

For OpenAI Codex, this repository also ships compatibility stubs under
`.codex/skills/`. Claude Code is the primary setup path described in this
README.

## How It Works

A typical review follows this path:

1. Start with `crypto-audit-router` to choose the right staged workflow.
2. Build audit context with `crypto-audit-context`.
3. If the code follows a paper, RFC, or spec, run `spec-delta-checker`.
4. Choose one or more domain auditors based on the system you are reviewing.
5. Use `crypto-fp-check` to filter weak or unsupported findings.
6. Use `crypto-report-writer` to turn verified issues into report-ready output.
7. Use `zkbugs-index`, harness generation, or formal verification support when
   you need prior art or stronger evidence.

The canonical workflow is documented in
`plugins/core-audit-flow/skills/crypto-audit-router/workflows/full-audit-flow.md`.

## Plugin Categories and When to Use Them

### `core-audit-flow`

Start here if you are new to the repository, unsure which auditor to use, or
want a guided review path from start to finish.

Skills: `crypto-audit-router`, `audit-common`, `crypto-audit-context`,
`spec-delta-checker`, `crypto-fp-check`, `crypto-report-writer`

### `zk-and-vm-auditors`

Use this category for circuits, proving systems, Cairo/Starknet, Noir, gnark,
and zkVM review.

Skills: `zk-circuit-auditor`, `cairo-auditor`, `noir-auditor`,
`zkvm-auditor`, `gnark-auditor`

### `crypto-primitive-auditors`

Use this category for elliptic curves, pairings, BLS, hash functions,
commitment schemes, Merkle trees, Fiat-Shamir transcripts, and encryption
schemes.

Skills: `ecc-pairing-auditor`, `hash-function-auditor`,
`commitment-scheme-auditor`, `merkle-tree-auditor`,
`fiat-shamir-auditor`, `encryption-scheme-auditor`

### `protocol-auditors`

Use this category for threshold systems, DKG flows, MPC protocols, and VDFs.

Skills: `dkg-threshold-auditor`, `mpc-auditor`, `vdf-auditor`

### `post-quantum-auditors`

Use this category for lattice-based cryptography and fully homomorphic
encryption review.

Skills: `lattice-auditor`, `fhe-auditor`

### `implementation-safety`

Use this category for cross-cutting implementation risks such as unsafe Rust,
side-channel exposure, dependency hygiene, and operational safety checks.

Skills: `rust-crypto-safety`, `side-channel-auditor`, `dependency-auditor`

### `evidence-and-tooling`

Use this category when you need prior-art lookup, stronger reproduction,
harness generation, fuzzing support, or bridges to external verification tools.

Skills: `zkbugs-index`, `kani-harness-gen`, `fuzz-harness-gen`,
`formal-verification-bridge`

## Repository Notes

- Category plugins live under `plugins/`
- The root Claude Code marketplace catalog lives at `.claude-plugin/marketplace.json`
- OpenAI Codex compatibility stubs live under `.codex/skills/`
- `zk-findings/` is the local workspace for engagement-specific notes and findings

## Advanced Note

Some evidence tooling is optional and more technical:

- `zkbugs-index` scripts require Python 3.10+
- `kani-harness-gen` and `fuzz-harness-gen` can be computationally intensive
  and may take noticeable time and system resources to run
- Optional script dependencies live in
  `plugins/evidence-and-tooling/scripts/requirements.txt`

## Contributing

Contributions should preserve the staged workflow of the framework: focused
plugins, explicit references and workflows, and tests that lock down key
contracts. If you change plugin structure or installation guidance, update the
README and the scaffolding tests together.

## Acknowledgments

This project draws ideas from
[trailofbits/skills](https://github.com/trailofbits/skills), especially around
structured audit workflows and skill organization.

This project is also partially based on publicly documented ZK vulnerability
references from [zksecurity/zkbugs](https://github.com/zksecurity/zkbugs),
which informed parts of the findings and indexing approach.

This repository is an independent project and is not affiliated with or
endorsed by Trail of Bits or zkSecurity.
