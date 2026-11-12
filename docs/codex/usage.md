# Codex Usage Guide

## Install

Add the marketplace and install the plugins:

```bash
codex plugin marketplace add Yue-Zhou1/zkcrypto-audit
```

Then open `/plugins`, install `core-audit-flow` and the categories you need,
and start a new session.

## Start an audit

```text
Use crypto-audit-router to run a complete staged crypto/ZK security audit on <target directories>; read the full audit workflow, build/update session state, run context, spec-delta, all applicable routing-matrix domain auditors, FP checks, PoC gates, and the report writer.
Do not stop after the first issue; finish with session JSON, candidate dispositions, PoC/proof artifacts, a readable report, and explicit reasons for any skipped stage or route.
```

Invoke a single skill explicitly with `$<skill-name>`.

## Rules the flow enforces

- The contract is the `crypto-audit-router` skill's
  `workflows/full-audit-flow.md`. Finding one issue is not a stop condition.
- Routing policy is that skill's `references/routing-matrix.md`.
  User-triggered skills (`kani-harness-gen`, `fuzz-harness-gen`,
  `formal-verification-bridge`, `differential-test-harness-gen`) run only on
  request.
- Working state goes to `.zkcrypto-audit/<engagement-id>/` in the directory the
  audit is run from: `session.json`, `reports/`, `pocs/`.

## Resume

```text
Use crypto-audit-router. Resume the session at .zkcrypto-audit/<engagement-id>/session.json.
```
