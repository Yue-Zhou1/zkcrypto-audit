---
name: audit-dashboard
description: >
  Serve a local, read-only web dashboard for an audit workspace: an animated
  view of the audit as it runs (review coverage per file, then candidate
  verification) that ends with the verified findings. Use when the user asks
  to open, show, or watch the audit dashboard or the audit's progress in a
  browser.
allowed-tools: Bash Read
---

# audit-dashboard

Starts a web server on `127.0.0.1` that displays the contents of a
`.zkcrypto-audit/` workspace. It reads files and writes nothing. It does not
run skills or call a model.

## When to Use

- The user asks to open or watch the audit dashboard
- The user wants to see the progress or results of an audit in a browser

## When NOT to Use

- Starting, resuming, or advancing an audit -> `crypto-audit-router`
- Writing the report -> `crypto-report-writer`
- `crypto-audit-router` never selects this skill; it runs only when the user
  asks

## Workflow

1. Locate the workspace: the `.zkcrypto-audit/` directory in the directory the
   audit runs from. If it does not exist, say so and stop.
2. Start the server as a background process, from this skill's directory:

   ```bash
   python3 scripts/serve.py --dir <path to .zkcrypto-audit>
   ```

   Options: `--port <n>` (default: a free port), `--no-open` (do not open a
   browser), `--verbose` (log requests).
3. Read the first line of output, `audit dashboard: http://127.0.0.1:<port>/`,
   and give the URL to the user.
4. Leave the server running. Stop it when the user asks, by ending the
   background process.

Requires Python 3.10 or later. No other dependencies.

## What It Shows

| View | Source |
|---|---|
| Wall: one brick per file in scope, one cell per route that reviews it | `session.json`: `routes[].scope`, `routes[].reviewed`. A route without `scope` is one brick |
| Hits and cracks on a cell | tool calls in `events.jsonl` |
| Bench: one circuit per candidate, one switch per verification gate | `session.json`: `candidates[].gates`, `poc_status`, `status`, `severity` |
| Findings: one card per `verified` candidate, ordered by severity | `session.json`: `candidates` |
| Pause mark beside the phase name, scene dimmed and still. Orange: the agent waits for the user. Grey: no session is running | `events.jsonl`: turn-end, waiting, and session-end records; or five minutes without a record while the engagement is not closed |

The page is one stage. The wall fills it during domain review. When
verification starts, the wall shrinks to the left and the bench appears on the
right. When reporting starts, both shrink to the top and the findings appear
below.

The engagement named in `.zkcrypto-audit/active` is selected by default. A
cell breaks when its route records the file in `reviewed`, or completes
without a `reviewed` list. A candidate without `gates` is drawn with a single
switch. A closed engagement is shown in its final state.

## Event Log

`events.jsonl` is written by the `core-audit-flow` plugin hooks in Claude Code.
They need `python3` on `PATH` and run `scripts/record.py`:

- after each tool call, successful or failed
- when a turn ends, a prompt is submitted, or a session starts or ends
- when Claude Code waits for a permission or for input

Each tool call adds one line holding:

- the tool name
- the paths it touched, relative to the project directory, when they are
  inside it
- the skill name, for a `Skill` call
- the subagent id, when the call was made by a subagent

The other events add one line holding the event kind. Commands, search
patterns, file contents, and prompt text are not recorded. A change to
`session.json` adds one line per changed fact, stamped with the time the hook
observed it. `events.state.json` in the engagement directory holds the last
`session.json` the hook compared against.

The hooks record only when `.zkcrypto-audit/active` exists in the project
directory or the working directory and names an engagement. Recording stops
once that engagement's phase is `closed` and resumes if the phase changes.

A `scope` path matches a recorded path when they are equal or one ends with
the other. Paths outside the project directory are not recorded.

Without the log, the dashboard animates the changes it observes while it is
running. Hits on cells are not shown.

## Limits

- Listens on `127.0.0.1` only and rejects requests whose `Host` header is not
  the loopback address and port it listens on.
- Does not follow symbolic links for `session.json`, `events.jsonl`, or
  `events.state.json`.
- Serves session state and the event log only. It does not serve report or
  PoC files.
- Read-only: it has no endpoint that changes a file.
- The live view runs about 2.5 seconds behind the workspace.
- The bench and the findings list become denser as their counts grow. Bench
  lanes that do not fit are counted as "+N more"; the findings list scrolls.

## Output Contract

Report to the user:

- `url`: the dashboard address
- `workspace`: the directory being served
- `process`: how to stop the server
