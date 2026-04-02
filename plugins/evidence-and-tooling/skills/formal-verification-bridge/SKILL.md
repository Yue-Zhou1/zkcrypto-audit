---
name: formal-verification-bridge
description: >
  Bridge validated audit findings into optional external formal-verification
  tooling (Ecne, Picus, Circomspect) with explicit environment checks,
  reproducible exports, and tool-scoped caveat capture.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# formal-verification-bridge

Auxiliary user-triggered bridge for external formal-verification workflows.

## When to Use

- A finding has survived domain review and `crypto-fp-check`, and you need external tool corroboration
- The engagement explicitly wants Ecne, Picus, or Circomspect outputs
- You need to produce reproducible tool input artifacts for independent review

## When NOT to Use

- As a default route from `crypto-audit-router` (this skill is user-triggered only)
- Before initial context building or domain triage is complete
- To claim formal proof from tools that are unavailable or unsupported in the current environment

## Core Review Areas

1. Environment and tool availability checks
2. Minimal normalized artifact export for reproducible replay
3. Tool-specific input contract adaptation and scope limits
4. Pass/fail result capture with caveats and unsupported-feature notes
5. Handoff back into `crypto-fp-check` for final consistency and reporting

## Workflow

### Phase 1: Intake and preflight

- Read `references/tooling-matrix.md`
- Read `references/handoff-contract.md`
- Execute `workflows/export-review.md`
- Confirm user intent, tool availability, and bounded target scope

### Phase 2: Export and run

- Build normalized artifact from verified findings/context
- Adapt artifact to selected tool format (Ecne/Picus/Circomspect)
- Run tool with explicit version capture and deterministic settings

### Phase 3: Result normalization

- Record pass/fail/unknown outcomes with tool logs and caveats
- Note unsupported constructs and approximation assumptions
- Return results through `crypto-fp-check` before report inclusion

## Output Contract

Produce a bridge handoff that includes:

- Selected tool(s), versions, and environment status
- Exported artifact path and normalization details
- Verification result plus caveats/unsupported-features list
- The re-entry path into `crypto-fp-check` and reporting flow

## Reference Index

- [references/tooling-matrix.md](references/tooling-matrix.md)
- [references/handoff-contract.md](references/handoff-contract.md)
- [workflows/export-review.md](workflows/export-review.md)
