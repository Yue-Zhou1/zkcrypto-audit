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

Three read sources, with optional team write-through:

```
READ  ← upstream repo      (community corpus, pulled at rebuild time)
READ  ← supplemental files (curated vendor findings: Trail of Bits, Zellic,
                            audit contests — shipped in data/external_findings/)
READ  ← org findings repo  (optional; your team's confirmed bugs)
WRITE → local_findings/    (always, for under-embargo work)
WRITE → org findings repo  (optional, for reported/fixed/disclosed findings)
```

All three are merged into the same sharded output, so a single shard read covers
every source. Each entry carries a `source` field — currently `upstream` (139),
`trail-of-bits` (4), `zellic` (4), and `audit-contests` (4). Filter on it when
provenance matters for citation.

Both repos are **configurable** in `<plugin-root>/config/zkbugs-sources.json`.
The org repo is optional.

## Locating the Index (do this first)

This skill's own files live in `skills/zkbugs-index/`, but the index, scripts,
and config live at the **plugin root — one level above `skills/`**. Looking only
inside the skill directory will find only this file plus its `references/` and
`workflows/` docs — no `index/`, no `scripts/`. That is expected and does not
mean the install is broken.

Resolve `<plugin-root>` once, then use it for every path below:

| Situation | `<plugin-root>` |
|---|---|
| Installed from the marketplace | `~/.claude/plugins/cache/<marketplace>/evidence-and-tooling/<version>/` |
| Working inside a repo checkout | `<repo>/plugins/evidence-and-tooling/` |

If neither is obvious, locate it directly. Note the `**` after
`evidence-and-tooling` — the marketplace install inserts a version directory
(e.g. `0.1.0/`), so a pattern without it matches only a repo checkout:

```
Glob: pattern="**/evidence-and-tooling/**/index/manifest.json"
```

`<plugin-root>` is the directory containing that `index/`.

Confirm the resolution by reading `<plugin-root>/index/manifest.json` — it
reports `count`, per-shard entry counts, and `built_at`.

## Index Is Pre-Built — No Build Step Required to Query

The sharded index ships **already built and committed**. To query it you need
only `Read`/`Grep` — no Python, no network, no build step. Skip straight to
[How to Query](#how-to-query).

`scripts/build_index.py` is a **maintenance** tool, needed only when refreshing
the index from upstream:

```bash
python3 <plugin-root>/scripts/build_index.py --rebuild
```

The script anchors its config, index, and data paths to the plugin root, so it
works from any working directory and `--config` is only needed to point at a
non-default config.

It requires Python 3.10+ and network access to clone upstream. A weekly GitHub
Action (`.github/workflows/zkbugs-rebuild.yml`) already runs this and opens a PR
on upstream drift, so manual rebuilds are rarely necessary. **If Python or the
network is unavailable, that blocks rebuilds only — querying still works.**

## Configuration

Configuration is only needed for rebuilds or org-repo write-through, not for
querying. Edit `<plugin-root>/config/zkbugs-sources.json`:

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
- `supplemental_files` — curated vendor finding sets under
  `data/external_findings/`, merged in on every rebuild. Paths are resolved
  relative to the plugin root.

## When to Query

Query this index when:
- A Phase 2 skill identifies a suspicious pattern and needs variant precedent
- You want to check if this exact root cause has appeared in a different project
- You are writing up a finding and need to cite prior art for severity justification

## How to Query

Read the index shard files directly — no script needed. The dataset is small
(<200 entries) so the agent can filter and rank in-context.

```
# Check manifest first for available shards and entry counts
Read: <plugin-root>/index/manifest.json

# By DSL — read the shard for the target language
Read: <plugin-root>/index/by_dsl/circom.json

# By vulnerability type
Read: <plugin-root>/index/by_vuln_type/under_constrained.json

# Keyword search on root_cause across all entries in a DSL shard
Grep: pattern="lookup table" path=<plugin-root>/index/by_dsl/halo2.json
```

Available DSL shards: `arkworks`, `bellperson`, `cairo`, `circom`, `gnark`,
`halo2`, `noir`, `pil`, `plonky3`, `risc0`. If the target's DSL has no shard,
query `by_vuln_type/` instead — the root-cause pattern often transfers across
languages.

After reading a shard, filter entries in-context by `vuln_type`, `source`,
`disclosure_state`, or keyword match on `root_cause`. Rank by: reproduced
(PoC available) > Soundness impact > severity (Critical > High > Medium > Low).

Only cite entries with `"disclosure_state": "disclosed"` in client-facing reports.

See `references/QUERY-PATTERNS.md` for common lookup patterns.

## When to Write

Write-back is the **exception, not the default close-out step**. Most audits
query this index and write nothing. Write only when ALL four hold:

1. **In scope** — the finding is ZK **circuit-level** (constraint system, witness
   generation, proof/verifier logic). Host-side Rust bugs, smart-contract
   business logic, dependency/CVE issues, and config mistakes are out of scope
   even when severe.
2. **Verified** — it passed `crypto-fp-check` (Phase 4)
3. **Severity Medium or above**
4. **Novel root cause** — no existing entry describes the same mechanism; a
   known pattern recurring in a new project is *not* novel

If any one fails, do not write. Querying without contributing is the normal,
correct outcome — record the decision and move on.

```bash
python3 <plugin-root>/scripts/contribute_bug.py \
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
├─ Can't find index/ or scripts/? → It's at the plugin root, NOT in this skill
│                                    dir. See "Locating the Index" above.
├─ Need to query?                 → Read: references/QUERY-PATTERNS.md
├─ Need vulnerability types?      → Read: references/VULN-TAXONOMY.md
├─ Adding/promoting a finding?    → Read: workflows/disclosure-lifecycle.md
└─ Configuring repos?             → Edit: <plugin-root>/config/zkbugs-sources.json
```

## When NOT to Use

- **General Rust review** without ZK context — use `rust-crypto-safety` instead
- **Smart contract business logic** — this index covers ZK circuit-level bugs only
- **Looking up CVEs** — use NVD/MITRE directly; this index tracks ZK-specific bugs
  that may or may not have CVEs assigned

## Rationalizations to Reject

| Rationalization | Why it's wrong |
|---|---|
| "The skill dir has only a few docs, so the install is broken" | The index and scripts live at the **plugin root**, one level above `skills/`. Resolve it per "Locating the Index" before concluding anything is missing |
| "I must run `build_index.py` before I can query" | The index ships pre-built and committed. Querying is `Read`/`Grep` only — no Python, no network |
| "Python isn't available, so this skill is unusable" | That blocks rebuild and write-back only. Query still works |
| "No match found, so this is novel" | Grep for root_cause keywords across DSL shards before concluding; root cause may be described differently |
| "The upstream entry is old, probably fixed everywhere" | The same pattern recurs in new projects constantly |
| "I found a real bug, so I should contribute it" | All four write gates must hold — circuit-level scope included. A verified host-side Rust bug does not belong here |
| "I'll add it to the index later" | Findings lost between sessions are findings lost forever |
