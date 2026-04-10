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
| "The code evidence is self-evident for High/Critical" | Self-evident to the auditor is not a PoC. Write and run the test. |
| "I'll note PoC status in the report instead of writing it" | PoC status in prose is not a PoC. The test file must exist and execute. |

## Workflow

Read `workflows/verification-gates.md` and execute it in order. Do not skip the
PoC gate for Critical/High claims.

## Reference Use

- Use `audit-common` severity definitions when assigning severity
- Use `audit-common` testing evidence definitions when arguing that tests are insufficient
- Use `zkbugs-index` only after the claim survives verification

## Output Contract

The final deliverable for each TRUE POSITIVE finding is **two artifacts**, not one:

**1. Verification verdict** (inline):
- `TRUE POSITIVE` or `FALSE POSITIVE`
- The exact gate that failed or the evidence that satisfied each gate
- The justified severity ceiling
- The correct next route: report, index, more domain review, or discard

**2. PoC test** — mandatory for High/Critical, recommended for Medium/Low:
- File path where the test was written into the target project's test suite
- Test function name, prefixed `poc_<finding-id>_` (e.g., `poc_f02_cross_module_signing`)
- Execution result: the actual `cargo test` / `pytest` / equivalent output line, or an explicit statement of the build blocker with fallback structural evidence
- A test that asserts the bug is present (passes while vulnerable, fails after fix)

**The report is incomplete until both artifacts exist for every High/Critical finding.**

## Reference Index

- [workflows/verification-gates.md](workflows/verification-gates.md)
