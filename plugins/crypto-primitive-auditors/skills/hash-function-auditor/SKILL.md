---
name: hash-function-auditor
description: >
  Audit ZK-friendly hash functions (Poseidon, Rescue, MiMC, Pedersen) for
  parameter selection, sponge construction, domain separation, and algebraic
  attack resistance.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# hash-function-auditor

Domain auditor for ZK-friendly hash primitive security and usage correctness.

## When to Use

- Auditing Poseidon, Rescue, MiMC, Pedersen, or related ZK hash implementations
- Reviewing sponge absorption/squeezing APIs and parameterization
- Verifying domain separation tags across hash call sites
- Checking round count and matrix choices against claimed security margins

## When NOT to Use

- Generic transcript review not focused on hash primitive internals
- Commitment opening verification without hash primitive concerns
- Marking hash findings as confirmed without verification gates

## Core Review Areas

1. Parameter selection and provenance
2. Sponge construction and capacity/rate safety
3. Domain separation and call-site context binding
4. Algebraic attack resistance for chosen rounds and constants
5. Matrix and S-box structural properties

## Workflow

### Phase 1: Parameter provenance review

- Read `references/hash-checklist.md`
- Verify round constants and MDS matrices are derived with clear provenance
- Confirm claimed security level matches round configuration

### Phase 2: Sponge and API review

- Execute `workflows/sponge-review.md`
- Validate absorption/squeezing behavior, padding, and capacity boundaries
- Review call sites for unsafe reuse across protocol domains

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize weak constants, missing domain separation, and capacity misuse

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after verification succeeds

## Output Contract

Produce a hash-audit handoff that includes:

- The primitive, parameter set, and call sites under review
- The exact security-property gap (capacity, rounds, separation, algebraic margin)
- The exploitability conditions and expected impact
- The next verification or reporting route

## Reference Index

- [references/hash-checklist.md](references/hash-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/sponge-review.md](workflows/sponge-review.md)
