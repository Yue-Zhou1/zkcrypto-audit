---
name: crypto-report-writer
description: >
  Write final audit findings for ZK and cryptographic reviews. Use when a
  finding has survived verification and needs to be turned into clear report
  prose with severity, impact, root cause, and test evidence.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# crypto-report-writer

Final reporting skill for the crypto audit framework.

## When to Use

- A finding has passed `crypto-fp-check` and needs report-ready prose
- You need a consistent report section structure across multiple findings
- You are summarizing severity and test evidence for an audit deliverable
- You are drafting disclosed writeups that may later map into `zkbugs-index`

## When NOT to Use

- The finding is still hypothesis-shaped or missing verification evidence
- You are still building protocol context or running domain-specific review
- You need to decide severity before the evidence is assembled

## Workflow

Choose the report variant first, then fill it with verified evidence only:

- [templates/client-report-template.md](templates/client-report-template.md) for client-facing delivery with concise executive and remediation language
- [templates/internal-report-template.md](templates/internal-report-template.md) for engineering/internal circulation with investigation notes and rollout risk
- [templates/public-disclosure-template.md](templates/public-disclosure-template.md) for external publication without private client context
- [templates/report-template.md](templates/report-template.md) for generic/default findings when no specialized variant is required

Do not write around missing proof or test gaps; state them explicitly.

## Reference Use

- Use `audit-common` for shared severity and finding-structure rules
- Use `crypto-fp-check` output as the source of truth for verified claims
- Cite `zkbugs-index` only when the referenced entry is disclosed and citable

## Output Contract

Produce a report-ready finding package that includes:

- Final severity and short title
- Summary, root cause, impact, and remediation
- Test evidence status, including PoC status where required
- Whether the writeup is suitable for external citation or index ingestion
