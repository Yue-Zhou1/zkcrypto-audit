---
name: dkg-threshold-auditor
description: >
  Audit DKG, threshold-signature, and FROST/MuSig-style code for rogue-key,
  nonce-binding, share-verification, and session-isolation failures. Use when
  reviewing key aggregation, VSS share checks, threshold reconstruction, or
  concurrent signing state.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# dkg-threshold-auditor

Domain auditor for distributed key generation and threshold signing flows.

## When to Use

- Auditing FROST, MuSig2, Feldman/Pedersen VSS, or custom threshold-signature code
- Reviewing nonce derivation, share verification, and participant identity binding
- Checking threshold reconstruction, interpolation, and abort-handling logic
- Reviewing concurrent session handling in multi-party signing services

## When NOT to Use

- Reviewing standalone signature verification without threshold state
- Building initial threat-model context for the full protocol
- Declaring a suspected threshold bug confirmed without verification

## Core Review Areas

1. Key aggregation and participant binding
2. Nonce derivation and session isolation
3. VSS share validation and reconstruction
4. Abort behavior and leakage paths

## Workflow

### Phase 1: Share and participant validation

- Read `references/dkg-checklist.md`
- Verify participant identifiers, key-aggregation commitments, and share bindings before any signing or reconstruction path

### Phase 2: Pattern hunt

- Read `references/finding-patterns.md`
- Treat nonce reuse, shared mutable session state, and retry logic as critical-path audit targets

### Phase 3: Session review

- Execute `workflows/session-review.md`
- Check message binding, aggregate public key binding, public polynomial commitments, and interpolation edge cases together

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce a threshold-protocol handoff that includes:

- The affected session, participant identifiers, nonces, shares, or commitments
- The exact binding, verification, or interpolation failure candidate
- Whether the issue is single-session, concurrent-session, or abort-path related
- The next verification or reporting route

## Reference Index

- [references/dkg-checklist.md](references/dkg-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/session-review.md](workflows/session-review.md)
