---
name: fix-verification
description: >
  Use when a supplied patch claims to fix a previously verified ZK or
  cryptographic finding and the remediation needs independent verification.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# fix-verification

Verify that a patch removes the finding's invariant violation across every
affected path; a blocked demonstration alone is not a fix.

## Preconditions

- The finding is in `verified_findings` and has a reproducible PoC or trigger.
- `fix_ref` identifies the proposed fix and its target revision.
- Otherwise, use `crypto-fp-check` (unverified claim) or
  `crypto-report-writer` (no patch to assess).

## Review Method

1. Record the vulnerable and fixed revisions; prove `fix_ref` is present.
2. Run the original PoC unchanged on both revisions and explain the changed
   result.
3. State the violated invariant, inspect the diff, and test a variant that
   exercises the same root cause.
4. Search sibling paths and review added code for equivalent omissions or new
   security regressions.
5. Run relevant regression tests, assign a verdict, and update session state.

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
