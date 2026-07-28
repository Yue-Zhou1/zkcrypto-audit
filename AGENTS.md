# zkcrypto-audit

`zkcrypto-audit` is a plugin collection for staged, evidence-driven audits of
zero-knowledge systems and cryptographic protocols.

## Project Layout

- `plugins/` contains 7 category plugins housing 42 audit skills.
- `.claude-plugin/marketplace.json` is the root marketplace manifest.
- `.agents/plugins/marketplace.json` is the Codex marketplace catalog.
- `.agents/plugins/marketplace.schema.json` validates Codex marketplace structure.
- `plugins/*/.codex-plugin/plugin.json` contains Codex plugin manifests.
- `plugins/_meta/codex-skill-registry.yaml` is the routing policy source of truth.
- `plugins/_meta/router-matrix.yaml` is the machine-readable route matrix.
- `.codex/skills/` contains hand-maintained Codex compatibility stubs.
- `plugins/evidence-and-tooling/` carries the zkbugs data plane at its **plugin
  root** (not inside `skills/`): a pre-built `index/`, plus `scripts/`,
  `config/`, and `data/`.
- `zk-findings/sessions/` stores local engagement session-state handoff files.

There is no root-level `scripts/` or `tests/` directory — the maintainer-only
scaffolding and regression suite were removed in `987d0e7`.

## Default Audit Flow

1. `crypto-audit-router`
2. `crypto-audit-context`
3. `spec-delta-checker`
4. Domain auditor(s)
5. `crypto-fp-check`
6. `crypto-report-writer`
7. `zkbugs-index`

## Codex Audit Completion Contract

When a user asks Codex to run `crypto-audit-router`, Codex must execute the
complete staged flow. Finding one valid issue is not a stop condition.

Codex must:

1. Start with `crypto-audit-context`.
2. Create or update `zk-findings/sessions/<engagement-id>.json`.
3. Record target scope, trust boundaries, critical paths, and unresolved
   assumptions in session state before domain review.
4. Select every applicable domain auditor from
   `plugins/_meta/router-matrix.yaml` or the router matrix reference.
5. Preserve each selected domain auditor's output contract separately instead
   of flattening everything into prose.
6. Maintain a finding candidate matrix with every candidate classified as one
   of:
   - verified finding
   - false positive
   - unverified or needs more evidence
   - informational observation
   - residual risk
7. Append domain handoffs, open findings, observations, and unresolved
   assumptions to the session state after each domain pass.
8. Send every surviving suspected finding to `crypto-fp-check`.
9. Enforce the Critical/High proof gate: no Critical or High severity may be
   reported without a compilable PoC or equivalently strong executable proof.
10. Downgrade, hold as unverified, or reject candidates that fail
    `crypto-fp-check` gates.
11. Send verified findings to `crypto-report-writer`.
12. Produce an auditor-readable report under `zk-findings/reports/`.
13. Store PoCs, reproduction tests, or proof artifacts under
    `zk-findings/pocs/` when applicable.
14. Use `zkbugs-index` only for verified, index-worthy findings or explicit
    prior-art lookup.
15. Record report paths, PoC paths, verification verdicts, index references,
    and next steps in the session state.
16. Close out only after confirming that session state, verified findings,
    report text, PoC artifacts, and index metadata all describe the same claim
    set.

For every selected route, Codex must leave an explicit disposition:

- `verified`
- `false_positive`
- `unverified`
- `observation`
- `residual_risk`

If a route is skipped, Codex must state why it is not applicable to the target.

Codex must not claim audit completion until all selected routes have a
disposition and the report-writing phase is complete.

