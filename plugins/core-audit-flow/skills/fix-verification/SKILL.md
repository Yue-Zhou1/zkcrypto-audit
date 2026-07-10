---
name: fix-verification
description: >
  Verify a supplied patch actually fixes a previously verified ZK or
  cryptographic finding. Use when a fix/patch reference is provided for a
  finding that already passed verification, to confirm the root cause (not just
  the demonstrated input) is removed, check for incomplete remediation in
  sibling paths, and record a remediation verdict.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# fix-verification

A patch that makes one PoC stop failing has not necessarily fixed the bug. Prove
the root cause is gone, not just the demonstrated input.

## When to Use

- A finding already in `verified_findings` has a supplied fix/patch reference
  (commit, PR, or diff)
- You need to confirm a fix removes the underlying defect, not only the exact
  input the PoC used
- You need to check sibling/parallel code paths for the same unpatched defect
- You need to record a remediation verdict and transition session state legally

## When NOT to Use

- The finding has not been verified yet, or there is no patch — send it to
  `crypto-fp-check` for truth/impact validation first
- A verified finding needs report prose but no fix has been supplied — route to
  `crypto-report-writer`
- Building initial context or hunting new findings — route to
  `crypto-audit-context` or the applicable domain auditor

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The original PoC fails now, so it is fixed" | The PoC may fail for an incidental reason; confirm it fails because the root cause is gone |
| "They patched the reported line, so we are done" | The same defect often lives in sibling paths the report did not enumerate |
| "The diff looks correct, no need to run anything" | A fix is a hypothesis until the PoC is re-run on both revisions |
| "Tests pass, so the patch is safe" | New patches introduce new attack surface; inspect what the diff added, not only what it removed |
| "Partial fix is basically a fix" | A partially-fixed finding is still exploitable; record `partially_fixed`, not `fixed` |

## Core Review Areas

1. Reproduce the original PoC against the vulnerable revision (confirm the
   baseline still demonstrates the defect).
2. Confirm the PoC fails on the fixed revision **for the intended reason**, not
   an unrelated build or input change.
3. Root-cause removal: verify the invariant the finding violated is now
   enforced, not just the single demonstrated input rejected.
4. Sibling-path search: look for the same defect in parallel loaders,
   call sites, or variants the patch did not touch.
5. New attack surface: inspect code the patch added, and run existing
   regression tests.
6. Remediation record: persist a `remediation_verifications` entry and
   transition session state legally.

## Workflow

Read `references/fix-verification-checklist.md`, then execute
`workflows/patch-review.md` in order. Do not skip the root-cause step for a
finding that was Critical or High.

## Reference Use

- Use `audit-common` severity definitions when judging residual risk of a
  partial fix
- Use `crypto-fp-check` PoC-gate expectations for the reproduction evidence a
  remediation verdict must carry
- Consult `../crypto-audit-router/references/state-machine.md` for the
  `remediation_in_progress` transitions

## Output Contract

Produce a remediation handoff that includes:

- `finding_id`
- `fix_ref`
- `root_cause_status`
- `regression_evidence`
- `verdict`
- `next_route`

`verdict` is one of `fixed`, `partially_fixed`, `not_fixed`, or `regressed`.
`root_cause_status` states whether the underlying invariant is now enforced or
only the demonstrated input is blocked. `regression_evidence` cites the
re-run PoC result on both revisions plus any regression-test output.
`next_route` is `closed` when every targeted finding is `fixed` with evidence,
or `verification_in_progress` when the patch changes the original claim or
introduces a candidate regression that needs re-verification.

## Reference Index

- [references/fix-verification-checklist.md](references/fix-verification-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/patch-review.md](workflows/patch-review.md)
