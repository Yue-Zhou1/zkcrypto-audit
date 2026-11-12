---
name: fix-verification
description: >
  Use when a supplied patch claims to fix a previously verified ZK or
  cryptographic finding and the remediation needs independent verification.
allowed-tools: Read Grep Glob Bash Write Edit
---

# fix-verification

Verify that a patch removes the finding's invariant violation across every
affected path; a blocked demonstration alone is not a fix.

## When to Use

- A commit, PR, tag, or diff is offered as the fix for a `verified` finding
- A client asks for a retest after remediation
- A fix landed and the report needs a remediation verdict

## When NOT to Use

- The claim itself is unverified -> `crypto-fp-check`
- There is no patch to assess, only a finding to write up ->
  `crypto-report-writer`
- The patch is a general code change with no finding behind it -> the domain
  auditor for that code

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The PoC no longer passes, so it is fixed" | A PoC can stop working because the build, API, or harness changed. Show that the new control is what rejects it |
| "The reported input is rejected now" | The finding is the violated invariant. Test a different input or path that exercises the same root cause |
| "The fix is in the function the report named" | Sibling loaders, variants, and call sites with the same omission are part of the remediation |
| "The patch is small, no need to review what it adds" | New validation code is new attack surface: check its own error paths and edge cases |
| "Their tests pass" | Passing tests show the tests pass. Run the original PoC on both revisions and record both results |

## Preconditions

- The finding is a `verified` candidate and has a reproducible PoC or trigger.
- `fix_ref` identifies the proposed fix and its target revision.

## Review Method

1. Record the vulnerable and fixed revisions; prove `fix_ref` is present.
2. Run the original PoC unchanged on both revisions and explain the changed
   result.
3. State the violated invariant, inspect the diff, and test a variant that
   exercises the same root cause.
4. Search sibling paths and review added code for equivalent omissions or new
   security regressions.
5. Run relevant regression tests, assign a verdict, and append it to
   `remediation_verifications` in `session.json`.

Use `references/fix-verification-checklist.md` as the evidence gate and
`workflows/patch-review.md` for the executable sequence. Critical/High fixes
require the same executable evidence standard as the original finding.

## Output Contract

Produce:

- `finding_id`, `fix_ref`, `root_cause_status`, `regression_evidence`
- `verdict`: `fixed`, `partially_fixed`, `not_fixed`, or `regressed`
- `next_route`: `closed` only when every targeted finding is fixed with
  evidence; otherwise `verification_in_progress`

## Reference Index

- [references/fix-verification-checklist.md](references/fix-verification-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/patch-review.md](workflows/patch-review.md)
