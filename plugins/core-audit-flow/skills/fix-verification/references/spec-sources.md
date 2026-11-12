# fix-verification Spec Sources

Authoritative references for remediation-verification methodology. This skill
verifies fixes; its "spec" is retest and remediation-tracking guidance rather
than a cryptographic construction standard.

## Normative / primary guidance

- **NIST SP 800-115**, *Technical Guide to Information Security Testing and
  Assessment* (2008), §8.3 (Remediation/Mitigation). Describes verifying
  mitigation actions by audit or retest: implementation can be verified only
  if a mirror copy of the original test is performed, and remediation is
  tested first for negative implications. Basis for the baseline-vs-fixed
  re-run in `workflows/patch-review.md`.
- **NIST SP 800-40 Rev. 4**, *Guide to Enterprise Patch Management Planning:
  Preventive Maintenance for Technology* (2022), §2.2–§2.3. Guidance on testing
  a patch before deployment (§2.3.1), verifying that a deployed patch is
  installed and has taken effect (§2.3.3), and monitoring that it stays in
  place (§2.3.4) — basis for the "fix present in the tested revision" and
  regression checks.
- **CWE / MITRE**, *Common Weakness Enumeration* (weakness classes with
  per-entry "Potential Mitigations"). Used to
  frame "root cause removed" versus "instance blocked": a fix that removes one
  instance of a weakness class does not necessarily remove the class.

## Informative / supporting material

- **OWASP Web Security Testing Guide**, chapter 5 "Reporting" (Findings).
  Informative: a re-test report summarizes the previous findings and the
  updated status of each previously identified vulnerability.
- **Keep a Changelog** (keepachangelog.com), v1.1.0. Informative convention for
  recording remediation outcomes and referencing fix commits/PRs in
  `CHANGELOG.md`, consistent with how this repository tracks changes.
- The `crypto-audit-router` skill's state machine: the
  `remediation_in_progress` transitions this skill drives.
- The `crypto-audit-router` skill's session-state schema (v3): the
  `remediation_verifications` record shape this skill persists.

## Applicability note

These references govern *process* (retest, confirm root cause, avoid
regressions), not the underlying cryptography. The cryptographic invariant a
given fix must restore comes from the finding's originating domain auditor and
its own `references/spec-sources.md`; cite that source in the remediation
record when arguing the root cause is (or is not) enforced.
