---
name: crypto-fp-check
description: >
  Verifies suspected ZK and cryptographic findings before reporting. Use when
  deciding whether a suspected vulnerability is a TRUE POSITIVE or FALSE
  POSITIVE, assigning severity, or enforcing the Critical/High PoC gate.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# crypto-fp-check

Do not report a finding because it looks dangerous. Verify it.

## When to Use

- Checking whether a suspected crypto or ZK bug is real
- Deciding whether severity is justified by evidence
- Enforcing PoC requirements before report or index entry
- Reviewing a draft finding that still feels hypothesis-shaped

## When NOT to Use

- Building initial audit context for a new target
- Hunting for new bug patterns across the codebase
- Writing final report prose without re-checking the underlying claim

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "This pattern is obviously exploitable" | Crypto bugs often collapse under missing attacker control or missing trigger conditions |
| "Prior art proves this is a real bug here too" | Prior art supports plausibility, not target-specific exploitability |
| "Critical/High is obvious; we can add a PoC later" | Critical/High without executable proof is still a hypothesis |
| "The implementation is weird, so the finding must be real" | Weird code and exploitable code are not the same thing |

## Workflow

Read `workflows/verification-gates.md` and execute it in order. Do not skip the
PoC gate for Critical/High claims.

## Reference Use

- Use `audit-common` severity definitions when assigning severity
- Use `audit-common` testing evidence definitions when arguing that tests are insufficient
- Use `zkbugs-index` only after the claim survives verification

## Output Contract

Produce a verification verdict that includes:

- `TRUE POSITIVE` or `FALSE POSITIVE`
- The exact gate that failed or the evidence that satisfied each gate
- The justified severity ceiling, including PoC status for Critical/High
- The correct next route: report, index, more domain review, or discard

## Reference Index

- [workflows/verification-gates.md](workflows/verification-gates.md)
