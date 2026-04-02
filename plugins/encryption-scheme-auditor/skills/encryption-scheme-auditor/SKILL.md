---
name: encryption-scheme-auditor
description: >
  Audit encryption implementations for AEAD nonce handling, decrypt oracle
  behavior, associated-data binding, key-derivation misuse, and decrypt-error
  side effects.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# encryption-scheme-auditor

Domain auditor for symmetric encryption and authenticated decryption safety.

## When to Use

- Reviewing AEAD mode integrations and nonce lifecycle handling
- Auditing decrypt error behavior for oracle side effects
- Checking associated-data binding and tag verification ordering
- Reviewing key-derivation context separation across protocol roles
- Validating key rotation and algorithm agility controls

## When NOT to Use

- Asymmetric key-exchange and signature protocol audits outside encryption modes
- Side-channel-focused constant-time analysis without encryption semantics
- Marking suspected encryption flaws as confirmed without verification gates

## Core Review Areas

1. Nonce generation, uniqueness, and reuse prevention under the same key
2. AEAD tag verification-before-plaintext discipline
3. Associated-data binding and domain separation
4. Padding/MAC oracle surfaces in decrypt error paths
5. KDF parameter/context separation and key lifecycle management

## Workflow

### Phase 1: Encrypt/decrypt path intake

- Read `references/encryption-checklist.md`
- Execute `workflows/decrypt-error-review.md`
- Map encrypt and decrypt entrypoints, including all error branches

### Phase 2: Nonce and tag review

- Verify nonce creation, persistence, and replay safeguards
- Confirm tag checks complete before any plaintext is released
- Ensure associated-data inputs match protocol intent in both directions

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize nonce reuse, decrypt oracle behavior, and KDF context collisions

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Use `zkbugs-index` only after the finding survives verification

## Output Contract

Produce an encryption-specific handoff that includes:

- The mode/implementation path and nonce lifecycle involved
- The decrypt error behavior and oracle risk surface
- Whether the issue is nonce, tag-ordering, AD-binding, KDF, or key-lifecycle related
- The next verification or reporting route

## Reference Index

- [references/encryption-checklist.md](references/encryption-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [workflows/decrypt-error-review.md](workflows/decrypt-error-review.md)
