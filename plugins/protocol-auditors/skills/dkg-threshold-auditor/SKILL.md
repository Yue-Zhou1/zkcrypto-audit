---
name: dkg-threshold-auditor
description: >
  Audit DKG, VSS, and threshold-signature code (Feldman/Pedersen VSS,
  Pedersen-style DKG, FROST per RFC 9591, MuSig2, threshold BLS) for
  rogue-key, key-bias, nonce-binding, share-verification,
  identifier/interpolation, resharing, and session-isolation failures. Use
  when reviewing key aggregation, VSS share checks, complaint rounds,
  threshold reconstruction, share refresh, or concurrent signing state.
allowed-tools: Read Grep Glob Bash
---

# dkg-threshold-auditor

Domain auditor for distributed key generation and threshold signing flows:
VSS, DKG rounds, key aggregation, signing sessions, and share refresh.

**Core principle:** review sessions as state machines, not isolated
functions; most breaks are a correct equation run on another session's state.

## When to Use

- Auditing FROST, MuSig2, Feldman/Pedersen VSS, threshold BLS, or custom
  threshold-signature code
- Reviewing nonce derivation, share verification, and participant identity
  binding
- Reviewing DKG commitments, complaints, disqualification, and resharing
- Checking threshold reconstruction, interpolation, and abort-handling logic
- Reviewing concurrent session handling in multi-party signing services

## When NOT to Use

- Threshold ECDSA (Paillier, MtA, GG18/CGGMP21) -> `threshold-ecdsa-auditor`
- Standalone signature verification without threshold state ->
  `signature-scheme-auditor`
- Nonce and CSPRNG generation mechanics -> `randomness-auditor`
- Point decoding, subgroup and pairing checks -> `ecc-pairing-auditor`
- General MPC (garbling, OT, SPDZ-style sharing) -> `mpc-auditor`
- Building initial threat-model context -> `crypto-audit-context`
- Declaring a suspected threshold bug confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "Nonces come from a CSPRNG, so reuse cannot happen" | Reuse in threshold signers comes from state, not the RNG: stored round-one nonces answered twice, retries, crash recovery, restored snapshots. A coordinator that replays round two with a different message gets linear equations in the signing share |
| "Deterministic nonces are the safe choice" | In multi-party signing the challenge depends on the other signers' nonces. A nonce derived from key and message alone repeats under different challenges, which is nonce reuse |
| "Each session is secure, so parallel sessions are too" | Wagner/ROS-style attacks combine many open sessions. If a signer's effective nonce is not bound to the message and every signer's commitments, concurrent sessions yield a forgery on an unsigned message |
| "The share verified against the commitments, so the dealer was honest" | It shows consistency with one committed polynomial. It does not show the degree is t-1, that every party saw the same commitments, or that the constant term was chosen independently of the others |
| "Every party contributes randomness, so the group key is unbiased" | A dealer that commits last, or decides after seeing others whether to be disqualified, steers the key. Without a proof of possession it can, at high thresholds, pick a constant term that cancels the others' contributions |
| "Identifiers are just 1..n" | They arrive from the wire or config. An identifier congruent to zero evaluates the polynomial at the secret; two congruent identifiers zero a Lagrange denominator or shrink the quorum |

## Core Review Areas

1. Key aggregation and participant binding (rogue keys, proofs of possession)
2. Nonce derivation and session isolation (binding factors, single use)
3. VSS share validation and reconstruction (equation, vector length,
   identifier and interpolation edge cases)
4. DKG rounds: key bias, complaints, agreement on qualified set and key
5. Partial-signature verification and aggregation (FROST, MuSig2, BLS)
6. Share refresh and resharing
7. Abort behavior and leakage paths

## Workflow

### Phase 1: Share and participant validation

- Read `references/dkg-checklist.md`; pin each protocol's governing document
  using `references/spec-sources.md`
- Verify participant identifiers, key-aggregation commitments, and share
  bindings before any signing or reconstruction path

### Phase 2: Session review

- Execute `workflows/session-review.md`
- Check message binding, aggregate public key binding, public polynomial
  commitments, and interpolation edge cases together

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Treat nonce reuse, shared mutable session state, and retry logic as
  critical-path audit targets

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route threshold ECDSA to `threshold-ecdsa-auditor`, nonce generation
  mechanics to `randomness-auditor`, curve and pairing checks to
  `ecc-pairing-auditor`, RFC 9591 or BIP-327 deltas to `spec-delta-checker`

## Output Contract

Produce a threshold-protocol handoff listing each candidate with:

- `protocol_and_round` (DKG, refresh, or signing, and the round involved)
- `affected_objects` (session, identifiers, nonces, shares, or commitments)
- `failure_candidate` (the binding, verification, or interpolation failure)
- `session_scope` (single-session, concurrent-session, or abort-path)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/dkg-checklist.md](references/dkg-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/session-review.md](workflows/session-review.md)
