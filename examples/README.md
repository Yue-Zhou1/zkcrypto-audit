# Example engagements

Sample outputs of the staged audit flow on open-source codebases.
[walkthrough.md](walkthrough.md) is a condensed run of the flow on a small
Groth16 verifier.

**These are raw framework outputs.** They have not been reviewed by the
maintainers of the audited projects and are not coordinated disclosures. They
may be wrong, outdated, or already fixed upstream. Do not cite them as findings
against those projects.

## Layout

Each directory under `engagements/` has the layout of an audit workspace
(`.zkcrypto-audit/<engagement-id>/`):

```
<engagement-id>/
  session.json   session state (schema v3)
  reports/       report and supporting write-ups
  pocs/          proof-of-concept tests copied out of the target
```

| Engagement | Target | Session state |
|---|---|---|
| `anchor-crypto-2026-07-10` | Anchor SSV client, threshold BLS surface | not kept |
| `codeX-anchor-crypto-2026-07-10` | same target, separate Codex run | not kept |
| `cb-audit-2026-04-10` | commit-boost-client 0.9.3 | yes |
| `halo2-gadgets-2026-06-05` | `halo2_gadgets` v0.4.0 with OrchardZSA deltas | yes |
| `raiko2-guests-crates-2026-07-13` | raiko2 zkVM guests and crates | not kept |
| `signal-ethereum-2026-04-28` | ZKasper RISC Zero guest | yes |
| `signal-ethereum-core-host-methods-ssz-multiproofs-2026-04-28` | same target, second run | yes |

## Notes

- Session files were written under schema v2 and migrated to v3. Fields with no
  v3 equivalent are under `extensions`.
- Reports predate the current report template.
- Paths in the reports are relative to the audited repository. Paths in
  `session.json` are relative to the engagement directory unless they point
  into the target.
- `scripts/sync.py --check` validates every `session.json` against the schema
  in the `crypto-audit-router` skill.
