# Query Patterns

Common query patterns for the zkbugs-index during audit workflows.

All paths below are relative to this skill's directory.

## Direct File Lookup

The index is stored as sharded JSON files, **pre-built and committed**. Read
them directly — no script and no build step needed.

### Index structure

```
index/
├── manifest.json          # Entry counts, available shards, build timestamp
├── by_dsl/                # One JSON array per DSL
│   ├── circom.json
│   ├── halo2.json
│   └── ...
└── by_vuln_type/          # One JSON array per vulnerability type
    ├── under_constrained.json
    ├── fiat_shamir_weak.json
    └── ...
```

Embargoed findings are never in the index. They live outside the skill in the
local findings directory (see "Storage Rules" in `SKILL.md`).

### Check what's available

```
index/manifest.json
```

The manifest lists entry counts per DSL and per vuln_type so you know which
shards exist before reading them.

## Common Audit Queries

### "I found an under-constrained signal in Circom — has this been seen before?"

```
index/by_dsl/circom.json
```

Then filter entries where `vuln_type == "under_constrained"`.

### "Is this specific root cause known?"

```
grep -n -i "assigned with <-- but not constrained" index/by_dsl/circom.json
```

### "What Halo2 bugs exist in the knowledge base?"

```
index/by_dsl/halo2.json
```

### "What can I cite in a client report?"

Read the relevant shard and filter for `"disclosure_state": "disclosed"`.
Only these entries are safe to include in client-facing deliverables as prior art.

### "Where did this entry come from?"

Every entry carries a `source` field. Present values in the shipped index:

| `source` | Meaning |
|---|---|
| `upstream` | zksecurity/zkbugs community corpus (every entry in the shipped index) |
| `org` | Your team's findings — only present once an org repo is configured |
| `local` | Embargoed findings written during an engagement |

To find what your team has contributed, filter for `"source": "org"` (or
`"local"` for still-embargoed work). Both are absent in a default install.

### "Show all soundness bugs across all DSLs"

```
index/by_vuln_type/soundness_error.json
```

## Ranking Results

When multiple entries match, rank by:

1. **Reproduced first** — entries with `"reproduced": true` (PoC available)
2. **Soundness impact** — entries with `"impact": "Soundness"`
3. **Severity** — Critical > High > Medium > Low > Informational

## Integration with Phase 2 Skills

Every Phase 2 skill MUST run this check before classifying a finding as novel:

```markdown
## Prior Art Check (required)

1. Read the DSL shard: `index/by_dsl/{dsl}.json`
2. Filter by `vuln_type` for exact matches
3. Grep for root_cause keywords if no exact type match

If a match is found:
- CITE the entry ID in the finding (e.g., "Similar to zkbugs/iden3/circomlib/...")
- Compare: same bug in different project, or a variant with different root cause?
- Use the matched entry's impact and PoC availability as severity evidence
```
