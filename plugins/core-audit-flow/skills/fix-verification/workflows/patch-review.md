# Patch Review Workflow

Inputs: verified `finding_id`, `fix_ref`, vulnerable revision `REV_VULN`, fixed
revision `REV_FIX`, and the original PoC/reproduction artifact. Stop and route
unverified claims to `crypto-fp-check`; a report without a patch goes to
`crypto-report-writer`.

1. Confirm the fix is in the reviewed revision and record both revisions.

   ```bash
   git merge-base --is-ancestor <fix-commit> <REV_FIX>
   ```

2. Run the unchanged PoC on `REV_VULN`; record its command and vulnerable
   result. If it no longer reproduces, restore a valid baseline before judging
   the patch.

3. Run that PoC on `REV_FIX`; record why the new control, rather than a build
   break or API change, rejects it.

4. State the invariant, inspect the diff, and test one variant input/path.
   A variant that still succeeds is `not_fixed` or `partially_fixed`.

5. Search sibling paths, review added code, and run relevant tests.

   ```bash
   git grep -n "<defective API or pattern>" -- '<relevant subtrees>'
   ```

6. Persist `finding_id`, `fix_ref`, root-cause status, evidence, and verdict
   in `remediation_verifications`. Use `fixed` only when all gates pass;
   otherwise choose `partially_fixed`, `not_fixed`, or `regressed`. Set
   `next_route: closed` only for fully evidenced fixes, else
   `verification_in_progress`.
