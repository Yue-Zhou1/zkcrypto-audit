# Report Template

## Title

`[Severity] Short finding name`

## Severity

- **Critical**: soundness break, forgery, private key recovery, or proof fabrication
- **High**: privacy leakage, practical side-channel, or missing input validation with concrete impact
- **Medium**: API misuse risk, DoS, serialization interoperability issue, or error oracle surface
- **Low**: configuration, feature-flag, dependency, or documentation weakness

Every **Critical** or **High** finding must include a **compilable PoC** or an
equivalently strong executable proof.

## Summary

What breaks, under what conditions, and why the target is affected.

## Affected Components

Files, functions, modules, protocol steps, and trust boundaries involved.

## Root Cause

Describe the exact invariant the implementation fails to enforce. If relevant,
name the specification delta explicitly.

## Impact

State the broken security property: soundness, privacy, authenticity, integrity,
or availability.

## Evidence

- Concrete code path
- Attacker-controlled input or trigger condition
- Verification artifacts, including PoC or executable proof where required

## Test Evidence

- **Known-answer tests**: present or missing
- **Boundary condition coverage**: present or missing
- **Negative tests**: present or missing
- **Algebraic property tests**: present or missing
- **Differential testing**: present or missing
- **Fuzz target coverage**: present or missing
- **Code coverage measurement**: present or missing
- **Wycheproof**: present or missing

## Remediation

Describe the required enforcement change, not just the intended caller behavior.

## Remediation Verification

Populate only when a fix has been supplied and checked by `fix-verification`.

- **Fix reference**: commit/PR/tag/diff
- **Verdict**: `fixed`, `partially_fixed`, `not_fixed`, or `regressed`
- **Root cause status**: invariant now enforced vs only the demonstrated input blocked
- **Regression evidence**: original PoC re-run result on the vulnerable and fixed
  revisions, plus regression-test output

## Residual Risk

State any remaining assumptions, rollout hazards, or verification gaps.
