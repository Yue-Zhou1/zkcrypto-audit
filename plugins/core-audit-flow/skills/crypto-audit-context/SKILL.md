---
name: crypto-audit-context
description: >
  Builds initial audit context for ZK and cryptographic code before
  vulnerability hunting. Use when starting a crypto audit, mapping trust
  boundaries, prioritizing code paths, or applying dimensional analysis to
  protocol values.
allowed-tools: Read Grep Glob Write Edit
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

- Verifying whether a specific suspected finding is real -> `crypto-fp-check`
- Assigning severity or writing report prose -> `crypto-fp-check`,
  `crypto-report-writer`
- Comparing code against a named specification -> `spec-delta-checker`
- Looking up prior art -> `zkbugs-index`

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
- Read `references/roles-and-guarantees.md` and fill the actor table: every
  role that supplies input, what the design promises the other roles if that
  role is malicious, offline, or misconfigured, and the mechanism that
  enforces each promise. A promise with no mechanism is a domain candidate,
  not a footnote

### Phase 4: Produce the audit handoff

- Summarize the highest-risk paths
- Name unresolved assumptions
- Hand off to a domain auditor or verification skill
- If the critical path contains hand-rolled fixed-point, decimal rescaling,
  or bignum arithmetic, recommend `fuzz-harness-gen` explicitly in the
  handoff (it is user-triggered and will not run unless asked)
- When run inside the staged flow, write the result into `session.json` in
  the audit workspace (`.zkcrypto-audit/<engagement-id>/`), following the
  workspace and schema rules of `crypto-audit-router`: `targets`,
  `trust_boundaries`, `critical_paths`, `unresolved_assumptions`, and
  `next_steps`
- Anything that already looks like a defect goes in `candidates` as
  `unverified`; intake does not decide it

## Output Contract

Produce a context handoff that includes:

- Critical paths and trust boundaries that deserve deepest review
- Dimension-map anomalies and unresolved assumptions
- Threat-model notes that the next skill must preserve
- The roles-and-guarantees table, with each unenforced promise listed
- Recommended next skills, with a brief reason for each route
- The `session.json` path, when run inside the staged flow

## Reference Index

- [references/dimensional-analysis.md](references/dimensional-analysis.md)
- [references/threat-model-checklist.md](references/threat-model-checklist.md)
- [references/roles-and-guarantees.md](references/roles-and-guarantees.md)
