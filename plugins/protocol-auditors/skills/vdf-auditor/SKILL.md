---
name: vdf-auditor
description: >
  Audit VDF implementations for sequentiality assumptions, Wesolowski/Pietrzak
  verifier soundness, challenge derivation integrity, and modulus/group setup
  risks.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# vdf-auditor

Domain auditor for verifiable delay functions and sequential-proof verification.

## When to Use

- Auditing VDF setup, proving, and verification code paths
- Reviewing Wesolowski or Pietrzak challenge and proof validation logic
- Checking delay-parameter and repeated-squaring assumptions
- Verifying modulus/group setup provenance and trusted assumptions

## When NOT to Use

- Generic signature or encryption audits without VDF sequentiality properties
- Treating performance shortcuts as safe without verifier-soundness review
- Marking a suspected VDF issue as confirmed without verification gates

## Core Review Areas

1. Delay parameter selection and sequentiality assumptions
2. Challenge prime derivation and transcript completeness
3. Repeated-squaring and verifier exponent correctness
4. Trusted-modulus/group setup integrity and trapdoor assumptions
5. Proof batching rules and shortcut-path soundness

## Workflow

### Phase 1: Setup-to-verifier mapping

- Read `references/vdf-checklist.md`
- Execute `workflows/challenge-review.md`
- Map setup, proof generation, and verifier code boundaries

### Phase 2: Challenge and proof verification

- Verify challenge derivation includes complete transcript context
- Confirm verifier exponent and relation checks match the target construction
- Validate delay-parameter handling cannot be bypassed by shortcut paths

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize malformed proof acceptance, transcript truncation, and modulus trust gaps

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a VDF-specific handoff that includes:

- The VDF construction and verifier routine involved
- The challenge derivation inputs and sequentiality invariant at risk
- Whether the issue is parameter, verifier, modulus/setup, or batching related
- The next verification or reporting route

## Reference Index

- [references/vdf-checklist.md](references/vdf-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/challenge-review.md](workflows/challenge-review.md)
