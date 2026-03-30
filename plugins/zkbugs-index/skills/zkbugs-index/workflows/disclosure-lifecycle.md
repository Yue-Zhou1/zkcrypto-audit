# Disclosure Lifecycle

Every finding written to the org repo carries a `disclosure_state`. The skill
enforces this lifecycle — do not skip states.

## States

```
under_embargo → reported → fixed → disclosed
                                  ↘ coordinated (extended embargo)
```

| State | Meaning | Stored where | Queryable by others? |
|-------|---------|-------------|---------------------|
| `under_embargo` | Active engagement. Not yet delivered to client. | `local_findings/` only | No |
| `reported` | Delivered to client in audit report. | Org repo if configured, otherwise local storage | Team only |
| `fixed` | Client confirmed fix deployed. | Org repo if configured, otherwise local storage | Team only |
| `disclosed` | 90-day embargo elapsed OR client approved early. | Org repo if configured, otherwise local storage | Yes — citable |
| `coordinated` | Extended embargo (regulatory, etc.). Requires justification. | Org repo if configured, otherwise local storage | Team only |

## Commands

### Create a new finding (under_embargo)

```bash
python contribute_bug.py \
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

Default state is `under_embargo`. Written to `local_findings/` only.

### Promote to reported (after report delivery)

```bash
python contribute_bug.py \
  --id local/circom/client-project/signal-x-under-constrained \
  --promote reported
```

Moves from `local_findings/` into the shard indexes. If org repo is configured,
the script rewrites the ID to `org/...` and writes the finding to:

```text
findings/<dsl>/<engagement-slug>/<finding-slug>.json
```

If no org repo is configured, the entry remains local and keeps its `local/...`
ID.

### Promote to fixed

```bash
python contribute_bug.py \
  --id org/circom/client-project/signal-x-under-constrained \
  --promote fixed \
  --fix-commit def456
```

Requires `--fix-commit`. Updates the entry in-place.

### Promote to disclosed

```bash
python contribute_bug.py \
  --id org/circom/client-project/signal-x-under-constrained \
  --promote disclosed \
  --fix-commit def456 \
  --disclose \
  --public-notes "short public summary"
```

Requirements enforced by the script:
1. `fix_commit` must be set
2. `--disclose` flag must be present (explicit opt-in)
3. Entry must currently be in `fixed` state

On disclosure, the following fields are **redacted**:
- `engagement` → removed
- `notes` → replaced with `public_notes` if provided, otherwise removed
- `location.repo` → removed unless `--public-repo` is passed explicitly

### Request extended embargo (coordinated)

```bash
python contribute_bug.py \
  --id org/circom/client-project/signal-x-under-constrained \
  --promote coordinated \
  --justification "Client requested 180-day embargo due to regulatory review"
```

Requires `--justification`. Logged in the entry metadata.

## Rules

1. **Never skip states.** `under_embargo` cannot jump to `disclosed`.
2. **Never demote.** A `disclosed` entry cannot return to `fixed`.
3. **Embargoed findings never appear in `--citable` queries.**
4. **Reports must only cite `disclosed` entries** from other engagements.
   Citing your own `reported` findings within the same engagement is allowed.
5. **The `--disclose` flag is a safety gate.** Without it, promotion to
   `disclosed` is rejected even if all other conditions are met.

## ID Rules

- `under_embargo` entries always begin as `local/<dsl>/<engagement>/<slug>`
- If an org repo is configured, promotion to `reported` rewrites the ID to
  `org/<dsl>/<engagement>/<slug>`
- If no org repo is configured, the entry keeps its `local/...` ID for all
  later states
