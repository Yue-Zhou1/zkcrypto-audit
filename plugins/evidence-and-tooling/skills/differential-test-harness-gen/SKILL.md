---
name: differential-test-harness-gen
description: >
  Generate cross-implementation differential test harnesses for cryptographic
  code: official test-vector and Wycheproof replay, normalization of
  error/result semantics, deterministic corpus capture, and evidence handoff
  to crypto-fp-check. User-triggered only — never auto-invoked by the audit
  flow.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
---

# differential-test-harness-gen

Evidence-tooling skill that builds differential test harnesses: run the
target implementation and a reference (or a second implementation) over the
same inputs, normalize their result/error semantics, and capture every
divergence as reproducible evidence. User-triggered only; the router never
selects it automatically.

## When to Use

- A reviewer explicitly requests a differential/cross-implementation test
  harness for a crypto primitive
- Replaying official test vectors (NIST CAVP/ACVP, RFC vectors) or Project
  Wycheproof cases against the target
- Producing deterministic crash/divergence corpora as evidence for
  `crypto-fp-check`

## When NOT to Use

- Automatic domain routing (this skill is `user_triggered_only` and is
  excluded from all router rules and phase defaults)
- Finding the vulnerability in the first place -> the domain auditors
- Property-based crash fuzzing of Rust code -> `fuzz-harness-gen`
- Bounded formal proofs -> `kani-harness-gen`

## Core Review Areas

1. Implementations compared: the target and a well-chosen reference (or
   two references), with versions pinned
2. Vector/corpus source: official vectors (CAVP/ACVP, RFC), Wycheproof
   where the primitive is covered, or a generated boundary corpus
3. Normalization: mapping each implementation's accept/reject/error
   representation onto a common verdict so a real divergence is not masked
   by cosmetic API differences
4. Determinism: fixed seeds, pinned versions, and captured inputs so every
   divergence reproduces
5. Evidence handoff: a corpus of diverging inputs plus a reproduction
   command per divergence, formatted for `crypto-fp-check`

## Workflow

### Phase 1: Scope the harness

- Read `references/differential-test-checklist.md`
- Identify the primitive, the target entry point, the reference
  implementation(s), and the applicable vector sources

### Phase 2: Build and replay

- Execute `workflows/wycheproof-replay.md`
- Generate the harness, replay vectors, and record divergences

### Phase 3: Normalize and capture

- Read `references/finding-patterns.md`
- Apply result/error normalization and capture a deterministic corpus

### Phase 4: Handoff

- Package divergences with reproduction commands and route to
  `crypto-fp-check`

## Output Contract

Produce a differential-testing evidence handoff that includes:

- `implementations_compared`
- `vector_or_corpus_source`
- `normalization_rules`
- `reproduction_command`
- `evidence_artifacts`
- `next_route`

## Reference Index

- [references/differential-test-checklist.md](references/differential-test-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/wycheproof-replay.md](workflows/wycheproof-replay.md)
