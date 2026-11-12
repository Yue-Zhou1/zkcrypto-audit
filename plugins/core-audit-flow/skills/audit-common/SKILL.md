---
name: audit-common
description: >
  Provides shared severity, testing-evidence, and finding-contract references
  for ZK and cryptographic audit skills. Use when classifying findings,
  checking whether test evidence is sufficient, or writing findings in a
  consistent structure.
allowed-tools: Read Grep Glob
---

# audit-common

Shared reference layer for the crypto audit framework.

## When to Use

- Classifying a suspected finding as Critical, High, Medium, or Low
- Checking whether existing tests are strong enough to support a claim
- Writing or reviewing a finding that should follow the framework's standard structure
- Keeping sibling audit skills aligned on severity and evidence language

## When NOT to Use

- Building initial audit context for a target -> `crypto-audit-context`
- Verifying whether a suspected bug is real -> `crypto-fp-check`
- Looking up prior art -> `zkbugs-index`

## How to Use

Read the smallest reference that answers the current question:

- Severity question: `references/severity-framework.md`
- Test evidence question: `references/testing-evidence.md`
- Candidate handoff or finding structure question: `references/finding-contract.md`

Do not duplicate these definitions in sibling skills unless the duplication is
strictly necessary for execution.

## Reference Index

- [references/severity-framework.md](references/severity-framework.md)
- [references/testing-evidence.md](references/testing-evidence.md)
- [references/finding-contract.md](references/finding-contract.md)
