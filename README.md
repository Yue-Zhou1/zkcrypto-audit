# zkcrypto-audit

![zkcrypto-audit banner](assets/banner.png)

![Claude Code](https://img.shields.io/badge/Claude_Code-plugin_collection-111827)
![Plugins](https://img.shields.io/badge/plugins-7_categories%2F43_skills-0f766e)
![Focus](https://img.shields.io/badge/focus-ZK_%2B_crypto-1d4ed8)
![Method](https://img.shields.io/badge/method-evidence_driven-b45309)

A guided audit toolkit, plugin collection, and staged security review workflow
for zero-knowledge systems and cryptographic protocols.

Instead of forcing every review into one large prompt, `zkcrypto-audit` breaks
the work into clear steps: understand the system, compare code to its governing
spec, run the right auditors, verify suspected issues, and turn the result into
report-ready evidence.

> **Human in the loop.** This toolkit supports a human reviewer; it does not
> replace one. Do not deliver raw model output to clients or reuse it as final
> findings without independent verification. Judgments, severity ratings, and
> reports remain the reviewer's responsibility.

## How It Works

1. `crypto-audit-router` plans the audit and keeps its state on disk.
2. `crypto-audit-context` maps trust boundaries, critical paths, and roles.
3. `spec-delta-checker` compares the code with its governing spec or paper.
4. Domain auditors review the parts of the system they specialise in.
5. `crypto-fp-check` verifies every candidate; Critical and High need a
   running PoC.
6. `crypto-report-writer` turns verified findings into the report.

`fix-verification` checks supplied patches afterwards. Working state goes to
`.zkcrypto-audit/<engagement-id>/` in the directory you run the audit from.

## What Is Included

| Plugin | Covers |
|---|---|
| `core-audit-flow` | Router, context, spec comparison, verification, reporting, fix verification |
| `zk-and-vm-auditors` | Circuits and proof systems, Cairo, Noir, gnark, folding schemes, zkVMs, on-chain verifiers, proven state transitions |
| `crypto-primitive-auditors` | Curves and pairings, hashes, commitments, Merkle trees, Fiat-Shamir, encryption, signatures, Ethereum cryptography |
| `protocol-auditors` | DKG and threshold signatures, threshold ECDSA, MPC, privacy protocols, VRFs, VDFs |
| `post-quantum-auditors` | Lattice schemes, FHE, ML-KEM, post-quantum signatures |
| `implementation-safety` | Rust safety, side channels, fault injection, randomness, dependencies |
| `evidence-and-tooling` | zkbugs prior-art index, fuzz and Kani harnesses, differential tests, formal-verification bridge |

## Quick Start

The skills use the open [Agent Skills](https://agentskills.io) format. Install
`core-audit-flow` first, then the categories you need.

```bash
# Claude Code
/plugin marketplace add Yue-Zhou1/zkcrypto-audit

# Codex
codex plugin marketplace add Yue-Zhou1/zkcrypto-audit

# Other agents that read Agent Skills
npx skills add Yue-Zhou1/zkcrypto-audit
```

Then start an audit:

```text
Use crypto-audit-router to run a complete staged crypto/ZK security audit on <target directories>. Do not stop after the first issue; finish with session state, candidate dispositions, PoCs, a report, and reasons for any skipped stage or route.
```

## More

- [examples/](examples/): sample engagement directories and a
  [walkthrough](examples/walkthrough.md)
- [docs/codex/usage.md](docs/codex/usage.md): Codex usage
- [docs/codex/architecture.md](docs/codex/architecture.md): how the packaging
  layers relate
- [AGENTS.md](AGENTS.md): repository layout and how to change or add skills
- [CHANGELOG.md](CHANGELOG.md)

## Acknowledgments

This project draws ideas from
[trailofbits/skills](https://github.com/trailofbits/skills), especially around
structured audit workflows and skill organization.

This project is also partially based on publicly documented ZK vulnerability
references from [zksecurity/zkbugs](https://github.com/zksecurity/zkbugs),
which informed parts of the findings and indexing approach.

This repository is an independent project and is not affiliated with or
endorsed by Trail of Bits or zkSecurity.
