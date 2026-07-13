# fix-verification Spec Sources

Authoritative references for remediation-verification methodology. This skill
verifies fixes; its "spec" is retest and remediation-tracking guidance rather
than a cryptographic construction standard.

## Normative / primary guidance

- **NIST SP 800-115**, *Technical Guide to Information Security Testing and
  Assessment* (2008), §3.4 and §5–§6. Establishes remediation retesting: after
  a fix, re-execute the original test to confirm the vulnerability is resolved
  and no new weaknesses were introduced. Basis for the baseline-vs-fixed
  re-run in `workflows/patch-review.md`.
- **NIST SP 800-40 Rev. 4**, *Guide to Enterprise Patch Management Planning*
  (2022), §2. Normative on verifying that a deployed patch actually applies to
  the affected assets and does not regress functionality — basis for the
  "fix present in the tested revision" and regression checks.
- **CWE / MITRE**, *Common Weakness Enumeration* remediation guidance. Used to
  frame "root cause removed" versus "instance blocked": a fix that removes one
  instance of a weakness class does not necessarily remove the class.

## Informative / supporting material

- **OWASP Web Security Testing Guide**, "Retesting / Remediation Verification".
  Informative checklist framing for confirming a fix and checking for
  reintroduction — reinforces the sibling-path search.
- **Keep a Changelog** (keepachangelog.com), v1.1.0. Informative convention for
  recording remediation outcomes and referencing fix commits/PRs in
  `CHANGELOG.md`, consistent with how this repository tracks changes.
- Repository state machine:
  `../crypto-audit-router/references/state-machine.md` — the
  `remediation_in_progress` transitions this skill drives.
- Session schema: `zk-findings/sessions/session-state-schema.json` (v2) —
  the `remediation_verifications` record shape this skill persists.

## Applicability note

These references govern *process* (retest, confirm root cause, avoid
regressions), not the underlying cryptography. The cryptographic invariant a
given fix must restore comes from the finding's originating domain auditor and
its own `references/spec-sources.md`; cite that source in the remediation
record when arguing the root cause is (or is not) enforced.
