---
name: crypto-audit-context
description: >
  Builds initial audit context for ZK and cryptographic code before
  vulnerability hunting. Use when starting a crypto audit, mapping trust
  boundaries, prioritizing code paths, or applying dimensional analysis to
  protocol values.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# crypto-audit-context

Start here before claiming vulnerabilities.

**Core principle:** verify what the code actually enforces, not what the docs
claim.

## When to Use

- Beginning a ZK or cryptographic audit
- Reading unfamiliar verifier, prover, signature, DKG, or serialization code
- Building a threat model before bug hunting
- Prioritizing which files and functions deserve the deepest review first

## When NOT to Use

- Verifying whether a specific suspected finding is a true positive
- Writing final severity decisions or report-ready findings
- Querying prior-art or disclosure state

## Audit Priority

Review highest-risk code first:

1. **Critical path** — `verify`, `batch_verify`, `deserialize`, `from_bytes`, transcript/challenge generation, `keygen`, `sign`, `prove`
2. **Trust boundary** — `unsafe` blocks, FFI modules, unchecked constructors, parameter loading
3. **Supporting** — caches, zeroization, type conversions, error conversion, optimized backends

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The README explains the architecture" | READMEs describe intent, not enforcement |
| "I'll map trust boundaries later during domain review" | Domain skills assume the dimension map is already built |
| "The codebase is small, I can hold the context in my head" | Small codebases have the same attack-surface density |

## Workflow

### Phase 1: Map the critical path

- Identify verifier, transcript, parsing, and randomness entrypoints
- Mark code that handles attacker-controlled or externally supplied values

### Phase 2: Build the dimension map

- Read `references/dimensional-analysis.md`
- Assign dimensions to values that cross trust boundaries
- Treat every unknown or inherited dimension as suspicious until proven safe

### Phase 3: Build the protocol threat model

- Read `references/threat-model-checklist.md`
- Record replay surfaces, authentication roots, downgrade surfaces, and corruption model assumptions

### Phase 4: Produce the audit handoff

- Summarize the highest-risk paths
- Name unresolved assumptions
- Hand off to a domain auditor or verification skill
- Initialize or update session state in `zk-findings/sessions/<engagement-id>.json`
  using `zk-findings/sessions/session-state-schema.json`
- Persist trust boundaries, open findings, and next-step routes so follow-on
  conversations continue from the same state

## Output Contract

Produce a context handoff that includes:

- Critical paths and trust boundaries that deserve deepest review
- Dimension-map anomalies and unresolved assumptions
- Threat-model notes that the next skill must preserve
- Recommended next skills, with a brief reason for each route
- Session state path updated in `zk-findings/sessions/` for downstream handoffs

## Reference Index

- [references/dimensional-analysis.md](references/dimensional-analysis.md)
- [references/threat-model-checklist.md](references/threat-model-checklist.md)
