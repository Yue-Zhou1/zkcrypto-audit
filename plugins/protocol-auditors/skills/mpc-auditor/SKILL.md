---
name: mpc-auditor
description: >
  Audit MPC implementations for garbled-circuit integrity, oblivious transfer
  misuse, share validation, Beaver triple authenticity, and transcript/session
  binding issues.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# mpc-auditor

Domain auditor for multi-party computation protocols and transcript integrity.

## When to Use

- Auditing garbled-circuit protocol implementations
- Reviewing oblivious transfer role and consistency checks
- Checking share validation before reconstruction
- Reviewing Beaver triple generation and authenticity guarantees
- Verifying transcript/session binding across rounds

## When NOT to Use

- Single-party cryptographic primitive audits without MPC coordination
- Pure circuit-constraint analysis without multi-party communication/state
- Confirming suspected findings without verification gates

## Core Review Areas

1. Participant authentication and role binding
2. Transcript/session separation across rounds and retries
3. OT input consistency and sender/receiver role correctness
4. Share MAC/commitment checks before reconstruction
5. Offline/online phase separation and Beaver triple authenticity

## Workflow

### Phase 1: Protocol phase mapping

- Read `references/mpc-checklist.md`
- Execute `workflows/share-validation-review.md`
- Enumerate setup, offline, and online phases for each participant role

### Phase 2: Share and transcript review

- Verify share validation occurs before any reconstruction logic
- Confirm transcript identifiers are session-specific and replay-resistant
- Validate participant role binding in all message handlers

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize unchecked share use, OT role confusion, and unauthenticated triples

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce an MPC-specific handoff that includes:

- The protocol phase and participant role involved
- The transcript/session binding or share-validation invariant at risk
- Whether the issue is OT, share, triple, garbled-circuit, or reconstruction related
- The next verification or reporting route

## Reference Index

- [references/mpc-checklist.md](references/mpc-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/share-validation-review.md](workflows/share-validation-review.md)
