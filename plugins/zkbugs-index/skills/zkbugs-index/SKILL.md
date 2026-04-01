---
name: zkbugs-index
description: >
  Queryable index of real-world ZKP vulnerabilities. Use when a Phase 2 audit
  skill identifies a suspicious pattern and needs to check whether a similar bug
  has been documented before — or when a confirmed finding needs to be recorded.
  Covers circom, noir, halo2, cairo, zkVM, and custom DSLs. Backed by upstream
  community corpus (zksecurity/zkbugs) and configurable organization findings repo.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# zkbugs-index

Queryable knowledge base of confirmed, peer-reviewed ZK vulnerabilities.

Two read sources, with optional team write-through:

```
READ  ← upstream repo     (community corpus, pulled at install/rebuild time)
READ  ← org findings repo (optional; your team's confirmed bugs)
WRITE → local_findings/   (always, for under-embargo work)
WRITE → org findings repo (optional, for reported/fixed/disclosed findings)
```

Both repos are **configurable** in `config/zkbugs-sources.json`. The org repo is optional.

## Configuration

Edit `config/zkbugs-sources.json` before first use:

```json
{
  "upstream": {
    "repo_url": "https://github.com/zksecurity/zkbugs",
    "local_path": null,
    "branch": "main"
  },
  "org": {
    "repo_url": null,
    "local_path": null,
    "branch": "main"
  }
}
```

- `upstream.repo_url` — community corpus (default: zksecurity/zkbugs). Set to any
  repo that follows the same entry schema, or set `local_path` to skip cloning.
- `org.repo_url` / `org.local_path` — optional organization findings repo. If
  unset, the skill stays in local-only mode and keeps promoted findings under
  `index/local_findings/`.

## Install

```bash
cd {baseDir}/scripts
python build_index.py --config ../config/zkbugs-sources.json
```

This clones the upstream repo (if not already cached), optionally loads the org
findings repo, and builds sharded indexes under `index/`. Run once at install,
re-run with `--rebuild` when upstream or org findings update.

## When to Query

Query this index when:
- A Phase 2 skill identifies a suspicious pattern and needs variant precedent
- You want to check if this exact root cause has appeared in a different project
- You are writing up a finding and need to cite prior art for severity justification

## How to Query

Read the index shard files directly — no script needed. The dataset is small
(<200 entries) so the agent can filter and rank in-context.

```
# By DSL — read the shard for the target language
Read: {baseDir}/index/by_dsl/circom.json

# By vulnerability type
Read: {baseDir}/index/by_vuln_type/under_constrained.json

# Keyword search on root_cause across all entries in a DSL shard
Grep: pattern="lookup table" path={baseDir}/index/by_dsl/halo2.json

# Check manifest for available shards and entry counts
Read: {baseDir}/index/manifest.json
```

After reading a shard, filter entries in-context by `vuln_type`, `source`,
`disclosure_state`, or keyword match on `root_cause`. Rank by: reproduced
(PoC available) > Soundness impact > severity (Critical > High > Medium > Low).

Only cite entries with `"disclosure_state": "disclosed"` in client-facing reports.

See `references/QUERY-PATTERNS.md` for common lookup patterns.

## When to Write

Write to the index when ALL of the following are true:
1. The finding has passed crypto-fp-check (Phase 4)
2. Severity is Medium or above
3. The root cause is novel (no exact match in existing index)

```bash
python {baseDir}/scripts/contribute_bug.py \
  --dsl circom \
  --vuln under_constrained \
  --impact Soundness \
  --severity Critical \
  --root-cause "Signal X assigned with <-- but constrained on different variable Y" \
  --repo "https://github.com/target/project" \
  --commit abc123 \
  --file circuits/foo.circom --line 42 \
  --engagement "client-project-slug" \
  --state under_embargo
```

See `workflows/disclosure-lifecycle.md` for state transitions and promotion.

## Storage Rules

- `under_embargo` findings always start as `local/...` IDs and are stored in
  `index/local_findings/findings.json`
- If an org findings repo is configured, promotion to `reported` moves the
  entry into that repo and rewrites the ID to `org/...`
- If no org repo is configured, promoted findings keep their `local/...` ID and
  remain in local storage

## Workflow Router

```
├─ Need to query?              → Read: references/QUERY-PATTERNS.md
├─ Need vulnerability types?   → Read: references/VULN-TAXONOMY.md
├─ Adding/promoting a finding? → Read: workflows/disclosure-lifecycle.md
└─ Configuring repos?          → Edit: config/zkbugs-sources.json
```

## When NOT to Use

- **General Rust review** without ZK context — use `rust-crypto-safety` instead
- **Smart contract business logic** — this index covers ZK circuit-level bugs only
- **Looking up CVEs** — use NVD/MITRE directly; this index tracks ZK-specific bugs
  that may or may not have CVEs assigned

## Rationalizations to Reject

| Rationalization | Why it's wrong |
|---|---|
| "No match found, so this is novel" | Grep for root_cause keywords across DSL shards before concluding; root cause may be described differently |
| "The upstream entry is old, probably fixed everywhere" | The same pattern recurs in new projects constantly |
| "This is too minor to record" | If it passed FP-check at Medium+, it belongs in the index |
| "I'll add it to the index later" | Findings lost between sessions are findings lost forever |
