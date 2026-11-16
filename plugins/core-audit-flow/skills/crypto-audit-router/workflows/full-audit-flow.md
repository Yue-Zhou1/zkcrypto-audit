# Full Audit Flow

Contract for a complete audit. Run the phases in order. Finding one valid
issue is not a stop condition. The audit is complete when the completion
contract at the end of this file holds.

## Audit workspace

All engagement output goes in one directory:

```
.zkcrypto-audit/<engagement-id>/
  session.json   session state, schema v3
  reports/       report and supporting write-ups
  pocs/          copies of PoC tests plus their runner output
  events.jsonl   events recorded by plugin hooks, where the agent supports
                 them; events.state.json holds the hooks' last-seen session
```

- Create `.zkcrypto-audit/` in the directory the audit is run from, unless the
  user names another location.
- `<engagement-id>` is `<target-slug>-<YYYY-MM-DD>`. Reuse the existing
  directory when resuming.
- If the target is a git repository, add `.zkcrypto-audit/` to its
  `.git/info/exclude`. Never commit the workspace into the target.
- PoC tests are written in the target's own test tree. Copy each one into
  `pocs/` with the command and output that confirmed it.
- Write the engagement id to `.zkcrypto-audit/active` when creating or
  resuming an engagement.
- The `audit-dashboard` skill serves a read-only view of this directory. When
  creating or resuming an engagement, tell the user in one sentence that
  asking for the audit dashboard shows the audit live in a browser. Start it
  only when the user asks.

## Session state

- Start from `references/session-state-template.json`. The schema is
  `references/session-state-schema.json`; `references/state-machine.md` defines
  legal phase transitions.
- The agent running this flow writes `session.json`. Domain auditors return
  their output contracts; the router records them.
- Update `session.json` at every phase boundary and after every domain pass,
  before starting the next step.
- `candidates` holds every suspected issue for its whole life. Status is one
  of:
  - `unverified`: raised, awaiting `crypto-fp-check` or more evidence
  - `verified`: passed every verification gate (set only in Phase 3)
  - `false_positive`: a gate failed; the failed gate is recorded
  - `observation`: true, but not a vulnerability
  - `residual_risk`: accepted or out-of-scope exposure worth recording
- `routes` holds one entry per skill the routing matrix matched: `pending`,
  `completed` with a summary, or `skipped` with a reason.
- Each domain route lists the files it reviews in `scope`, as paths relative
  to the target root. `reviewed` lists the entries of `scope` whose review is
  finished.
- Paths in `session.json` are relative to the engagement directory unless they
  point into the target.
- Timestamps are UTC ISO-8601. Take each one from the system clock when the
  event happens (`date -u +%Y-%m-%dT%H:%M:%SZ`); never estimate or backfill.
  Set `created_at` once. Append to `phase_history` on every phase change. Set
  `started_at` and `completed_at` on each route, and `raised_at` and
  `decided_at` on each candidate.

## Phase 1: Intake

- Run `crypto-audit-context`
- Record targets and revisions, trust boundaries, critical paths, the
  roles-and-guarantees table, and unresolved assumptions
- **Stop condition:** `session.json` is schema-valid with non-empty `targets`,
  `trust_boundaries`, and `critical_paths`
- **Escalation:** if scope or trust boundaries are incomplete, stay in intake

## Phase 2: Domain review

- Run `spec-delta-checker` when a specification, paper, RFC, or reference
  implementation governs the code, or when the project's own documentation
  makes claims the code should enforce. Skip it only when neither exists, and
  record the skip with that reason
- Select every route in `references/routing-matrix.md` whose situation matches
  the target. Add a `routes` entry for each, with its `scope`, before running
  any of them
- A matched route may be skipped only with a recorded reason. If a matched
  skill is not installed, record the route as `skipped` with the reason "skill
  not installed" and tell the user which plugin provides it. Do not perform
  that review under another skill's name
- Skills listed as user-triggered in the routing matrix are never selected
  here. They may be recommended in `next_steps`
- Run each selected auditor and keep its output contract intact. Independent
  auditors may run in parallel; merge their candidates afterwards
- When the target is an application running on a zkVM rather than the zkVM
  itself, route `proven-state-transition-auditor` alongside `zkvm-auditor`; the
  roles-and-guarantees table from intake is its first input
- For ZK targets, `zkbugs-index` may be queried for prior art at any point in
  this phase. A match does not verify a candidate
- After each auditor, add its candidates to `candidates`, set the route to
  `completed` with a summary, `candidate_ids`, and `reviewed`, and append new
  unresolved assumptions
- **Stop condition:** every matched route is `completed` or `skipped`
- **Escalation:** if an assumption stays unresolved, route the auditor that can
  resolve it before leaving this phase

## Phase 3: Verification

- Send every `unverified` candidate to `crypto-fp-check`
- Record the verdict, the gate that decided it, and the evidence in
  `verdict_rationale`, and the outcome of each gate evaluated in `gates`
- Critical and High require an executed PoC, or `pending_poc` under the
  build-blocker rule in `crypto-fp-check`. Without either, lower the severity
  ceiling to Medium or leave the candidate `unverified`
- **Stop condition:** no candidate is `unverified` without a recorded reason
  and a `next_steps` entry
- **Escalation:** if evidence is insufficient, return the candidate to its
  owning domain auditor with explicit reproduction requirements

## Phase 4: Reporting

- Run `crypto-report-writer` over the `verified` candidates, then list
  observations and residual risks
- Write the report under `reports/`. An audit with no verified findings
  produces a report of scope, routes run and skipped, and what was ruled out
- Set `report_ref` on each reported candidate and list files under `artifacts`
- **Stop condition:** every `verified` candidate appears in the report with the
  same severity and claim as in `session.json`
- **Escalation:** if report text goes beyond the verified evidence, return to
  verification

## Phase 5: Closeout

- Check that `session.json`, the report, and the PoC artifacts describe the
  same claim set
- Optional: contribute a finding to `zkbugs-index` only when its write gates
  hold (ZK circuit-level, verified, Medium or above, novel root cause). Record
  the decision
- Refresh `next_steps`, validate `session.json` against the schema, set `phase`
  to `closed`

## Phase 6: Remediation verification

- Enter only when a fix reference is supplied for a `verified` candidate
- Run `fix-verification`; record each outcome in `remediation_verifications`
  without rewriting the original candidate
- If the patch changes the original claim or introduces a candidate
  regression, return to verification
- **Stop condition:** every targeted finding has a remediation verdict with
  evidence

## Completion contract

Do not claim the audit is complete until all of these hold:

1. `session.json` exists, is schema-valid, and `phase` is `closed`
2. Every route the matrix matched is `completed` or `skipped` with a reason
3. Every candidate has a status, and none is `unverified` without a stated
   reason
4. No Critical or High is reported without an executed PoC or an explicit
   `pending_poc` with its build blocker
5. A report exists under `reports/` and agrees with `session.json`
6. PoCs are stored under `pocs/` with their execution output
7. The final message to the user states which routes were skipped and why,
   including `spec-delta-checker` and any `zkbugs-index` contribution decision
