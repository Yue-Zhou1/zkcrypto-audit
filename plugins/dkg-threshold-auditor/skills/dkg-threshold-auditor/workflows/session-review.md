# Session Review

Review DKG and threshold-signing sessions as state machines, not isolated
functions.

## Phase 1: Key and nonce binding

- Verify the nonce derivation binds the message, aggregate public key, and fresh randomness
- Check participant identifiers and session identifiers at every message boundary
- Confirm key aggregation defenses prevent rogue-key cancellation

## Phase 2: Share verification

- Check that each participant verifies their shares against the public polynomial commitments
- Verify the share-check equation uses the correct group, field, and exponent indexing
- Reject duplicate or zero identifiers before any interpolation work begins

## Phase 3: Reconstruction and concurrency

- Review Lagrange interpolation inputs and denominator checks explicitly
- Verify threshold reconstruction accepts exactly the intended quorum
- Check concurrent sessions for reused nonces, shares, caches, or mutable global state

Abort handling is part of the security model. A safe happy path does not rescue
an unsafe multi-session implementation.
