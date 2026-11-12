---
name: zkbugs-index
description: >
  Queryable index of real-world ZK proof-system vulnerabilities. Use during a
  ZK audit to check whether a suspicious pattern has documented precedent, to
  cite prior art for a verified finding, or to record a verified, novel,
  circuit-level finding. Covers circom, halo2, cairo, gnark, arkworks,
  plonky3, zkVM, and other DSLs. Backed by the zksecurity/zkbugs corpus and
  an optional organization findings repo.
allowed-tools: Read Grep Glob Bash
---

# zkbugs-index

Index of confirmed ZK vulnerabilities, shipped pre-built inside this skill.

```
READ  <- upstream repo        community corpus, pulled at rebuild time
READ  <- org findings repo    optional; your team's confirmed bugs
WRITE -> local findings dir   always, for under-embargo work (outside the skill)
WRITE -> org findings repo    optional, for reported/fixed/disclosed findings
```

All read sources are merged into the same shards. Each entry carries a
`source` field. The shipped index contains upstream entries only. The manifest
lists the shards that exist; most entries are `under_constrained`.

## When to Use

- A domain auditor sees a suspicious pattern in ZK code and wants precedent
- Checking whether the same root cause has appeared in another project
- Citing prior art for a verified finding
- Recording a verified finding that passes every write gate below

## When NOT to Use

- General Rust review without ZK context -> `rust-crypto-safety`
- Smart-contract business logic: this index covers ZK circuit-level bugs
- CVE lookup: use NVD or the vendor advisory; entries here may have no CVE
- Deciding whether a candidate is real -> `crypto-fp-check`. A match here
  supports plausibility and proves nothing about the target

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "I must run `build_index.py` before I can query" | The index ships pre-built. Querying is reading JSON: no Python, no network |
| "Python isn't available, so this skill is unusable" | That blocks rebuild and write-back only |
| "No match found, so this is novel" | Search `root_cause` keywords across DSL shards first; the same cause is often described differently |
| "There is a match, so the candidate is real" | Prior art is plausibility. The trigger path in the target still has to be proven |
| "The upstream entry is old, probably fixed everywhere" | The same pattern recurs in new projects constantly |
| "I found a real bug, so I should contribute it" | All four write gates must hold, circuit-level scope included |

## How to Query

Paths are relative to this skill's directory.

1. Read `index/manifest.json` for entry counts, available shards, and
   `built_at`.
2. Read the shard for the target language, `index/by_dsl/<dsl>.json`, or for
   the bug class, `index/by_vuln_type/<type>.json`. If the target's DSL has no
   shard, use `by_vuln_type/`.
3. Search `root_cause` text for keywords when the class is unclear:

   ```bash
   grep -n -i "lookup table" index/by_dsl/halo2.json
   ```

4. Filter in context by `vuln_type`, `source`, and `disclosure_state`. Rank by
   reproduced (PoC available), then Soundness impact, then severity.

Cite only entries with `"disclosure_state": "disclosed"` in client-facing
reports. See `references/QUERY-PATTERNS.md` for common lookups and
`references/VULN-TAXONOMY.md` for the type vocabulary.

## When to Write

Write only when all four hold:

1. **In scope:** the finding is ZK circuit-level (constraint system, witness
   generation, proof or verifier logic). Host-side Rust bugs, contract business
   logic, dependency issues, and configuration mistakes are out of scope
2. **Verified:** it passed `crypto-fp-check`
3. **Severity Medium or above**
4. **Novel root cause:** no existing entry describes the same mechanism. A
   known pattern recurring in a new project is not novel

If any one fails, do not write. Record the decision and move on.

```bash
python3 scripts/contribute_bug.py \
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

- `under_embargo` findings get `local/...` IDs and are stored outside the
  skill, in the local findings directory: `~/.zkcrypto-audit/zkbugs/local_findings/`
  by default. Override with `--local-findings-dir`, the
  `ZKBUGS_LOCAL_FINDINGS_DIR` environment variable, or `local_findings_dir` in
  the config. They are not written into the index, and a rebuild excludes
  them from the shards
- With an org findings repo configured, promotion to `reported` moves the
  entry into that repo and rewrites the ID to `org/...`
- Without one, promoted findings keep their `local/...` ID and stay in the
  local findings directory

## Maintenance

Rebuild and write-back require Python 3.10+. Querying does not.

```bash
python3 scripts/build_index.py --rebuild
```

The scripts resolve `config/` and `index/` relative to this skill's
directory. `config/zkbugs-sources.json` sets the upstream repo and the
optional org repo. `supplemental_files` lists extra JSON finding sets to merge
on rebuild; every entry in such a set must cite a source that can be opened.
In the source repository a weekly workflow rebuilds the index and opens a pull
request when upstream drifts.

## Output Contract

For a query, return:

- `matches`: entry IDs with `source`, `vuln_type`, `disclosure_state`, and the
  one-line `root_cause`
- `relevance`: why each match bears on the candidate, and what differs
- `citable`: which matches may be cited externally
- `next_route`

For a write, return the entry ID, its state, and which of the four gates were
checked and how.

## Reference Index

- [references/QUERY-PATTERNS.md](references/QUERY-PATTERNS.md)
- [references/VULN-TAXONOMY.md](references/VULN-TAXONOMY.md)
- [workflows/disclosure-lifecycle.md](workflows/disclosure-lifecycle.md)
