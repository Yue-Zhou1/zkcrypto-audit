---
name: lattice-auditor
description: >
  Audit lattice-based cryptography for LWE/RLWE parameter soundness, noise
  sampling correctness, rejection-sampling safety, and decryption-failure
  assumptions.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# lattice-auditor

Domain auditor for lattice-based cryptographic implementations.

## When to Use

- Auditing LWE/RLWE parameter sets and claimed security levels
- Reviewing noise/distribution sampling and rejection-sampling code
- Checking seed/domain separation and key derivation paths
- Validating decapsulation behavior and decryption-failure assumptions

## When NOT to Use

- Traditional ECC-only audits without lattice constructs
- High-level protocol reviews detached from parameter/sampling internals
- Declaring suspected lattice issues confirmed without verification gates

## Core Review Areas

1. Parameter-set provenance and claimed security margins
2. Distribution/noise sampling correctness and bias control
3. Domain separation for seeds and derivation contexts
4. Decryption failure bounds and constant-time decoding boundaries
5. KEM decapsulation checks and reject-path correctness

## Workflow

### Phase 1: Parameter and provenance intake

- Read `references/lattice-checklist.md`
- Execute `workflows/parameter-review.md`
- Map claimed scheme parameters to concrete code constants

### Phase 2: Sampling and failure-path review

- Trace sampling paths for noise and rejection behavior
- Validate decryption failure assumptions against implementation behavior
- Confirm decapsulation reject paths are strict and constant-time where required

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize sampling bias, seed reuse, and failure-bound underestimation

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a lattice-specific handoff that includes:

- The parameter set, sampling routine, or decapsulation path involved
- The concrete failure bound or bias condition at risk
- Whether the issue is parameter, sampling, seed-separation, or reject-path related
- The next verification or reporting route

## Reference Index

- [references/lattice-checklist.md](references/lattice-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/parameter-review.md](workflows/parameter-review.md)
