# patch-review.md

Executable remediation-verification workflow. Run the steps in order for each
targeted finding. Do not declare `fixed` until Steps 2–6 all have evidence.

## Inputs

- `finding_id` — a finding already in `verified_findings`.
- `fix_ref` — commit SHA, PR, tag, or diff claiming to fix it.
- The original PoC/reproduction artifact and the pre-fix revision it was
  verified against.

If the finding is not verified, or `fix_ref` is absent, stop: route to
`crypto-fp-check` (unverified) or `crypto-report-writer` (no fix supplied).

## Step 1: Establish both revisions

1. Identify the vulnerable revision `REV_VULN` (what the finding was verified
   against) and the fixed revision `REV_FIX` named by `fix_ref`.
2. Confirm `fix_ref` is actually contained in `REV_FIX`:

   ```bash
   git merge-base --is-ancestor <fix-commit> <REV_FIX> && echo "fix present" || echo "FIX NOT IN REVISION"
   ```

3. Record both revision identifiers for the remediation record.

## Step 2: Baseline reproduction on REV_VULN

1. Check out `REV_VULN` (or a worktree of it).
2. Run the original PoC unchanged and capture the command + output.
3. Confirm it still demonstrates the defect. If it does not, the baseline is
   invalid — re-establish the reproduction before continuing (do not credit the
   fix for a PoC that never triggered).

## Step 3: Fixed-revision behavior on REV_FIX

1. Check out `REV_FIX`.
2. Run the **same** PoC unchanged; capture command + output.
3. Confirm it now fails, and identify *why*: the specific check the patch added
   must be the cause. Rule out unrelated build breaks, changed APIs, or a
   harness that errored before reaching the assertion.

## Step 4: Root-cause removal

1. State the invariant the finding violated in one sentence.
2. Read the diff and confirm it enforces that invariant generally.
3. Build at least one **variant** input exercising the same root cause through a
   different value or path; run it on `REV_FIX` and confirm rejection.
4. If only the exact PoC input is blocked but a variant still passes, the root
   cause is intact → verdict `not_fixed` or `partially_fixed`.

## Step 5: Incomplete-remediation search

1. Enumerate sibling paths (other loaders, call sites, curves/parameter sets,
   message variants).
2. Grep the tree for the same pattern:

   ```bash
   git grep -n "<the defective pattern or API>" -- '<relevant subtrees>'
   ```

3. Confirm each sibling is unaffected or also patched. An unpatched sibling ⇒
   `partially_fixed`.

## Step 6: New attack surface + regression

1. Review the **added** lines of the diff for new panics, overflow, unchecked
   deserialization, changed error semantics, or timing variation.
2. Run existing regression/unit tests on `REV_FIX`; capture output.
3. A correctness or security regression ⇒ verdict `regressed`.

## Step 7: Verdict, record, and transition

1. Assign `verdict` ∈ {`fixed`, `partially_fixed`, `not_fixed`, `regressed`}.
2. Set `root_cause_status` and assemble `regression_evidence` (Step 2 + Step 3
   results and any Step 6 test output).
3. Persist a `remediation_verifications` entry (`finding_id`, `fix_ref`,
   `verdict`, `regression_evidence_refs`, `verified_at`) in the session file.
4. Transition session state:
   - every targeted finding `fixed` with evidence ⇒
     `remediation_in_progress -> closed`, `next_route: closed`;
   - patch changes the original claim or introduces a candidate regression ⇒
     `remediation_in_progress -> verification_in_progress`,
     `next_route: verification_in_progress`.

## Output

Emit the Output Contract fields from `SKILL.md`: `finding_id`, `fix_ref`,
`root_cause_status`, `regression_evidence`, `verdict`, `next_route`.
