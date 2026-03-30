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

Both repos are **configurable** in `config/config.json`. The org repo is optional.

## Configuration

Edit `config/config.json` before first use:

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
python build_index.py --config ../config/config.json
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

Always specify at least `--dsl` or `--vuln` to avoid a full-corpus scan.

```bash
# Exact match by DSL and vulnerability type
python {baseDir}/scripts/query_index.py --dsl circom --vuln under_constrained --limit 5

# Keyword search on root cause text
python {baseDir}/scripts/query_index.py --dsl halo2 --keyword "lookup table" --limit 3

# Org findings only
python {baseDir}/scripts/query_index.py --source org --limit 20

# Citable entries only (disclosed, safe for reports)
python {baseDir}/scripts/query_index.py --dsl circom --vuln under_constrained --citable

# Semantic similarity (requires sentence-transformers)
python {baseDir}/scripts/query_index.py --similar "commitment polynomial evaluated at wrong point" --dsl halo2
```

See `references/QUERY-PATTERNS.md` for the full query DSL and common patterns.

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
└─ Configuring repos?          → Edit: config/config.json
```

## When NOT to Use

- **General Rust review** without ZK context — use `rust-crypto-safety` instead
- **Smart contract business logic** — this index covers ZK circuit-level bugs only
- **Looking up CVEs** — use NVD/MITRE directly; this index tracks ZK-specific bugs
  that may or may not have CVEs assigned

## Rationalizations to Reject

| Rationalization | Why it's wrong |
|---|---|
| "No match found, so this is novel" | Try `--similar` before concluding; root cause may be described differently |
| "The upstream entry is old, probably fixed everywhere" | The same pattern recurs in new projects constantly |
| "This is too minor to record" | If it passed FP-check at Medium+, it belongs in the index |
| "I'll add it to the index later" | Findings lost between sessions are findings lost forever |
