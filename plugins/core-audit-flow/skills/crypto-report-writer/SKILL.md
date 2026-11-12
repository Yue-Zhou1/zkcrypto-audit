---
name: crypto-report-writer
description: >
  Write the audit report for ZK and cryptographic reviews. Use when findings
  have passed verification and need report prose with severity, root cause,
  impact, evidence, and remediation, for client, internal, or public
  audiences.
allowed-tools: Read Grep Glob Write Edit
---

# crypto-report-writer

Turns verified candidates into a report. Adds no new claims.

**Core principle:** the report states what verification established, at the
severity verification assigned.

## When to Use

- Candidates have passed `crypto-fp-check` and need report-ready prose
- An audit is closing and needs its report, including one with no findings
- A verified finding needs a public disclosure write-up
- A `fix-verification` verdict needs to be added to an existing finding

## When NOT to Use

- The claim is still a hypothesis or lacks verification evidence ->
  `crypto-fp-check`
- Context building or domain review is still in progress ->
  `crypto-audit-router`
- Severity is undecided -> `crypto-fp-check` with `audit-common`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The PoC is implied by the code walkthrough" | A Critical or High without an executed PoC or an explicit `pending_poc` is not reportable at that severity |
| "I'll round the severity up so the client takes it seriously" | Severity comes from verification; the report does not renegotiate it |
| "No findings, so no report" | Scope, routes run and skipped, and what was ruled out are the deliverable of a clean audit |
| "The false positives are not worth mentioning" | Recording what was ruled out, and why, saves the next reviewer from repeating it |
| "Remediation: callers should validate the input" | State the enforcement change in the code, not the behaviour that would avoid the bug |

## Workflow

1. Read the verified candidates from `session.json` in the audit workspace, or
   from the `crypto-fp-check` verdicts when run standalone. Use nothing else as
   a source of claims.
2. Pick the audience: client delivery, internal circulation, or public
   disclosure. Default to the base report when none is stated.
3. Fill [templates/report-template.md](templates/report-template.md): report
   body, one section per verified finding, then the audience sections.
4. List observations, residual risks, and anything left unverified with the
   reason.
5. Write the report under `reports/` in the audit workspace, set `report_ref`
   on each reported candidate, and add the file to `artifacts.reports`.
6. Compare the report with `session.json`: same findings, same severities,
   same PoC status. State any proof or test gap explicitly.

## Reference Use

- `audit-common` for severity definitions, finding structure, and evidence
  categories
- `crypto-fp-check` output as the source of truth for verified claims
- Cite a `zkbugs-index` entry only when it is disclosed and citable

## Output Contract

Produce a report file and state:

- `report_path`
- `audience` (base, client, internal, or public)
- `findings_reported`: IDs with final severity
- `omitted`: candidates not reported, with the reason for each
- `suitable_for_external_citation`: yes or no, with the reason

## Reference Index

- [templates/report-template.md](templates/report-template.md)
