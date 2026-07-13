# fix-verification Checklist

Collect evidence for every applicable gate; an unmet gate prevents a `fixed`
verdict.

## Scope

- [ ] `finding_id` is already verified; `fix_ref`, the vulnerable revision,
      and the original PoC/trigger are identified.
- [ ] The fixed revision contains `fix_ref`.

## Reproduction

- [ ] The unchanged PoC demonstrates the defect on the vulnerable revision.
- [ ] The unchanged PoC fails on the fixed revision because the intended
      control is reached, not because the build, API, or harness broke.

## Root cause and coverage

- [ ] The violated invariant is stated; the diff enforces it generally.
- [ ] A distinct input or path exercising that invariant is rejected.
- [ ] Sibling loaders, call sites, variants, and parameter sets are either
      unaffected or patched.

## Regression and record

- [ ] Added code was reviewed for security-relevant new behavior; relevant
      tests were run and recorded.
- [ ] `verdict` is `fixed`, `partially_fixed`, `not_fixed`, or `regressed`.
- [ ] Session state records `finding_id`, `fix_ref`, root-cause status,
      evidence references, verdict, and timestamp. Close only if every
      targeted finding is fixed with evidence.
