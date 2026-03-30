# Query Patterns

Common query patterns for the zkbugs-index during audit workflows.

## CLI Reference

```
python query_index.py [OPTIONS]

Filters (at least one required):
  --dsl DSL              Filter by DSL: circom, noir, halo2, cairo, zkvm, etc.
  --vuln TYPE            Filter by vuln type (see VULN-TAXONOMY.md)
  --keyword TEXT         Substring match on root_cause field
  --similar TEXT         Semantic similarity search on root_cause (requires sentence-transformers)
  --id ID               Lookup a specific entry by ID

Source filters:
  --source SOURCE        "upstream", "org", or "all" (default: all)
  --citable              Only return entries with disclosure_state: disclosed

Output:
  --limit N              Max results (default: 5)
  --format FORMAT        "json", "table", or "brief" (default: table)
  --index-dir DIR        Path to index directory (default: from config)
  --config PATH          Path to config.json (default: ../config/config.json)
```

## Common Audit Queries

### "I found an under-constrained signal in Circom — has this been seen before?"

```bash
python query_index.py --dsl circom --vuln under_constrained --limit 5
```

### "Is this specific root cause known?"

```bash
python query_index.py --keyword "assigned with <-- but not constrained" --limit 3
```

### "What Halo2 bugs exist in the knowledge base?"

```bash
python query_index.py --dsl halo2 --format table
```

### "Find similar root causes (fuzzy match)"

```bash
python query_index.py --similar "polynomial commitment degree check missing" --dsl halo2 --limit 3
```

### "What can I cite in a client report?"

```bash
python query_index.py --dsl circom --vuln under_constrained --citable --format brief
```

Only returns entries with `disclosure_state: disclosed`. Safe to include in
client-facing deliverables as prior art.

### "What has our team found across all engagements?"

```bash
python query_index.py --source org --limit 50 --format table
```

### "Show all soundness bugs across all DSLs"

```bash
python query_index.py --vuln soundness_error --format table --limit 0
```

`--limit 0` returns all matches.

## Integration with Phase 2 Skills

Every Phase 2 skill MUST run this check before classifying a finding as novel:

```markdown
## Prior Art Check (required)

1. Exact: `python query_index.py --dsl {dsl} --vuln {type} --limit 5`
2. Keyword: `python query_index.py --keyword "{root_cause_summary}" --limit 3`
3. If no match from 1-2 and semantic search is enabled:
   `python query_index.py --similar "{root_cause_full}" --dsl {dsl} --limit 3`

If a match is found:
- CITE the entry ID in the finding (e.g., "Similar to zkbugs/iden3/circomlib/...")
- Compare: same bug in different project, or a variant with different root cause?
- Use the matched entry's impact and PoC availability as severity evidence
```
