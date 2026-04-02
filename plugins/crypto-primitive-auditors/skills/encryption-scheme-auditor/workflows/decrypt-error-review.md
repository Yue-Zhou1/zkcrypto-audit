# Decrypt Error Review Workflow

Step-by-step review for decrypt path integrity, nonce lifecycle, and oracle resistance.

## Phase 1: Trace decrypt error paths

1. Enumerate decrypt entrypoints, return codes, and failure branches
2. Confirm decrypt failures collapse to uniform error surfaces where required
3. Record any side effects (logs, retries, counters, metrics) on each failure path

## Phase 2: Verify tag-before-plaintext discipline

1. Identify where authentication tag checks occur in each decrypt path
2. Ensure no plaintext is parsed, logged, or returned before tag validation
3. Validate associated-data is bound consistently with encrypt-side inputs

## Phase 3: Review nonce lifecycle and KDF contexts

1. Trace nonce generation, transport, persistence, and replay handling
2. Verify nonce uniqueness enforcement under retries, parallelism, and crash recovery
3. Confirm KDF context separation across encryption/decryption and role boundaries

## Phase 4: Cross-reference and handoff

- Compare observed issues against `references/finding-patterns.md`
- Forward surviving findings to `crypto-fp-check`
- Route verified findings to reporting and indexing workflows
