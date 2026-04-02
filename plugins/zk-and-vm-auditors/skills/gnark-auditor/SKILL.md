---
name: gnark-auditor
description: >
  Audit gnark circuits and Go witness pipelines for frontend/backend mismatch,
  public/private witness exposure, constraint API misuse, and serialization
  boundary errors.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# gnark-auditor

Domain auditor for gnark circuit code and Go-side witness assignment paths.

## When to Use

- Auditing `frontend.API` constraints against generated backend systems
- Reviewing public/private witness declarations and assignment flows
- Checking Go witness construction and serialization/deserialization boundaries
- Reviewing `AssertIsEqual`, selectors, hints, and range assumptions in constraints
- Validating curve and field parameter configuration across setup and proving

## When NOT to Use

- Multi-DSL ZK circuit reviews not centered on gnark — use `zk-circuit-auditor`
- Rust `unsafe`, zeroization, or feature-flag issues — use `rust-crypto-safety`
- Declaring a suspected gnark issue confirmed without verification gates

## Core Review Areas

1. Frontend/backend mismatch between `frontend.API` intent and generated constraint system
2. Public/private witness binding and accidental data promotion
3. Go-side witness assignment and serialization boundaries
4. Constraint API misuse (`AssertIsEqual`, selectors, hints, range assumptions)
5. Curve/field parameter mismatches and unsafe defaults

## Workflow

### Phase 1: Frontend/backend trace

- Read `references/gnark-checklist.md`
- Execute `workflows/frontend-backend-review.md`
- Trace each security-critical value from frontend declarations to backend constraints

### Phase 2: Assignment and boundary review

- Verify public witness declarations match protocol expectations
- Review Go witness assignment and error handling before serialization
- Check witness decode paths for permissive defaults or silent coercions

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize frontend/backend mismatch, witness exposure, and modulus confusion patterns

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a gnark-specific handoff that includes:

- The frontend API declarations and backend constraints involved
- The witness visibility or serialization boundary under review
- Whether the issue is mismatch, witness exposure, assignment, API misuse, or field-parameter related
- The next verification or reporting route

## Reference Index

- [references/gnark-checklist.md](references/gnark-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/frontend-backend-review.md](workflows/frontend-backend-review.md)
