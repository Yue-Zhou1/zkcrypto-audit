# fix-verification Checklist

Work these in order. A finding is not remediated until every applicable item
has evidence.

## 1. Preconditions

- [ ] The finding exists in `verified_findings` (already passed
      `crypto-fp-check`). If not, stop and route to `crypto-fp-check`.
- [ ] A concrete fix reference is supplied: commit SHA, PR number, tag, or diff.
      If not, stop — there is nothing to verify.
- [ ] The original PoC or reproduction artifact is available (test file,
      script, or a precise manual trigger sequence).

## 2. Baseline reproduction (vulnerable revision)

- [ ] Check out / identify the pre-fix revision the finding was verified against.
- [ ] Re-run the original PoC and confirm it still demonstrates the defect
      (passes-while-vulnerable, or triggers the documented failure).
- [ ] Record the exact command and observed result.

## 3. Fixed-revision behavior

- [ ] Check out / identify the fixed revision named by `fix_ref`.
- [ ] Re-run the same PoC unchanged.
- [ ] Confirm it now fails **for the intended reason** (the specific check the
      patch added rejects the attack), not because of an unrelated build error,
      changed API, or altered input.
- [ ] Record the observed result and the reason it now fails.

## 4. Root-cause removal (not just the demonstrated input)

- [ ] Identify the invariant the finding violated (e.g. "attesting indices must
      be deduplicated before summing balance", "keystore ciphertext must be
      MAC-verified before use").
- [ ] Confirm the patch enforces that invariant generally, not only for the one
      input the PoC used.
- [ ] Construct at least one variant input that exercises the same root cause
      via a different value/path and confirm it is also rejected.

## 5. Incomplete-remediation search

- [ ] Enumerate sibling code paths: other loaders, parallel call sites, other
      curves/parameter sets, other message variants.
- [ ] Grep for the same pattern the finding described elsewhere in the tree.
- [ ] Confirm each sibling either is not affected or is also patched. Any
      unpatched sibling downgrades the verdict to `partially_fixed`.

## 6. New attack surface introduced by the patch

- [ ] Read the added lines of the diff (not only the removed lines).
- [ ] Check for newly introduced panics, overflow, unchecked deserialization,
      timing variation, or changed error semantics.
- [ ] Run the existing regression tests and record the result. A regression is
      verdict `regressed`.

## 7. Verdict and session state

- [ ] Assign a `verdict`: `fixed`, `partially_fixed`, `not_fixed`, or
      `regressed`.
- [ ] Set `root_cause_status` (invariant now enforced vs only demonstrated
      input blocked).
- [ ] Persist a `remediation_verifications` record with `finding_id`,
      `fix_ref`, `verdict`, `regression_evidence_refs`, and `verified_at`.
- [ ] Transition session state: `remediation_in_progress -> closed` when every
      targeted finding is `fixed` with evidence; otherwise
      `remediation_in_progress -> verification_in_progress`.
