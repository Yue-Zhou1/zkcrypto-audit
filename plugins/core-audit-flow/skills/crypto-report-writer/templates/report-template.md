# Report Template

One template for every audience. Write the report body and each finding with
the base sections, then add the sections for the audience at the end of this
file. Severity definitions and the PoC rule are in `audit-common`.

## Report body

### Summary

Target and revision, dates, what was reviewed, and the result in two or three
sentences: counts by severity and the single most important issue.

### Scope and method

- In-scope components and the revision or commit reviewed
- Out-of-scope components and why
- Skills run, and skills skipped with the reason for each
- Attacker model and trust assumptions taken from intake

### Findings overview

| ID | Severity | Title | Status |
|---|---|---|---|

### Findings

One section per verified finding, using the finding sections below, ordered by
severity.

### Observations and residual risk

Items that are true but not vulnerabilities, accepted risks, and anything left
unverified with the reason and what would settle it.

## Finding sections

### `[Severity] Short finding name`

**Severity:** Critical / High / Medium / Low

**Impacted property:** soundness, privacy, authenticity, integrity,
completeness, or availability.

**Affected components:** files, functions, protocol steps, and trust
boundaries involved.

**Summary:** what breaks, under what conditions, and why this target is
affected.

**Root cause:** the exact invariant the implementation fails to enforce. Name
the specification delta if there is one.

**Trigger path:** the attacker-controlled input and the code path that carries
it to the missing or wrong check.

**Evidence:**

- Code references (`file:line`)
- PoC: test name, location, the command run, and its output; or `pending_poc`
  with the build blocker
- Math or protocol argument where the PoC does not cover the full claim

**Test evidence gaps:** the evidence categories from `audit-common` that were
missing, by name.

**Remediation:** the enforcement change required in the code.

**Remediation verification:** only when `fix-verification` has run.

- Fix reference: commit, PR, tag, or diff
- Verdict: `fixed`, `partially_fixed`, `not_fixed`, or `regressed`
- Root cause status: invariant now enforced, or only the demonstrated input
  blocked
- Regression evidence: PoC result on the vulnerable and fixed revisions, plus
  regression-test output

**Residual risk:** remaining assumptions, rollout hazards, verification gaps.

## Audience sections

Add these to the base report. Remove nothing from the base unless stated.

### Client delivery

- **Executive summary** before the report summary: impact on the client's
  deployment and remediation urgency, without implementation detail
- Per finding, **Remediation plan:** priority order, rollout recommendation,
  and how to validate the fix (regression tests, negative tests, monitoring)
- Per finding, **Client action checklist:** patch implemented, backports
  assessed, verification tests rerun, deployment communication prepared

### Internal circulation

- Per finding, **Investigation notes:** the initial hypothesis, code paths and
  commits reviewed, alternative hypotheses ruled out
- Per finding, **Exploitability qualifiers:** attacker capabilities required,
  environmental constraints, reliability of the exploit path
- Per finding, **Rollout risk:** compatibility, performance, and migration risk
  of the remediation
- **Next steps:** owner, fix plan, backport strategy, post-fix verification

### Public disclosure

Publish only what the affected party has agreed to disclose.

- Replace scope and method with **Affected versions:** affected range, first
  fixed version, mitigated-but-unfixed configurations
- **Disclosure timeline:** reported, acknowledged, fix released, disclosed
- Keep summary, impact, and remediation (upgrade guidance and workarounds);
  remove client-private context, internal notes, and unreleased PoC detail
- **Credits** and **References:** public commits, advisories, CVE identifiers
