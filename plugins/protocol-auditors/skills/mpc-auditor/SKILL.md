---
name: mpc-auditor
description: >
  Audit multi-party computation implementations: garbled circuits (free-XOR,
  half-gates, selective failure), oblivious transfer and OT extension,
  SPDZ-style MAC checks, Beaver triple authenticity, share validation,
  malicious vs semi-honest claims, abort and fairness handling, and
  transcript/session binding. Use when reviewing 2PC/MPC protocol code,
  preprocessing pipelines, or multi-round secure-computation handlers.
allowed-tools: Read Grep Glob Bash
---

# mpc-auditor

Domain auditor for multi-party computation protocols and transcript
integrity: garbled circuits, oblivious transfer, and secret-sharing protocols.

**Core principle:** an MPC protocol is secure only in the adversary model it
was proven in. Pin the claimed model, then look for each check it requires.

## When to Use

- Auditing garbled-circuit protocol implementations
- Reviewing oblivious transfer role and consistency checks and OT extension
- Checking share validation before reconstruction
- Reviewing Beaver triple generation and authenticity guarantees
- Verifying transcript/session binding across rounds, retries, and sessions
- Testing a malicious-security claim, abort handling, fairness, or broadcast

## When NOT to Use

- Threshold ECDSA (Paillier, MtA, GG18/CGGMP21) -> `threshold-ecdsa-auditor`
- DKG, VSS ceremonies, FROST, MuSig2, threshold BLS -> `dkg-threshold-auditor`
- Single-party signature review, no MPC -> `signature-scheme-auditor`
- Single-party encryption review, no MPC -> `encryption-scheme-auditor`
- Circuit constraints with no multi-party state -> `zk-circuit-auditor`
- Homomorphic-encryption parameters in preprocessing -> `fhe-auditor`
- Seed, CSPRNG, and nonce lifecycle -> `randomness-auditor`
- Confirming a suspected finding -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "It is a semi-honest protocol, so missing checks are by design" | Semi-honest security says nothing once a party deviates: privacy fails along with correctness. If the deployed parties are separate organisations or client software, the model mismatch is the finding |
| "A cheating party can only make the output wrong, and that gets noticed" | Selective failure: a garbler that corrupts one row or one OT message makes the evaluator abort only for some inputs, so the abort itself leaks an input bit |
| "OT extension is just a faster base OT" | Without the extension's consistency check a malicious receiver sends inconsistent choice vectors and learns bits of the sender's correlation secret, which opens both messages of every transfer |
| "The MAC check runs at the end, so every share is verified" | It protects only what happens after it passes. Outputs, comparisons, or branches revealed earlier were computed on unauthenticated openings |
| "Triples come from our own preprocessing service" | A source the online parties cannot check is a trusted dealer. A wrong triple shifts the product by an error the attacker knows; a reused one reveals the difference of two secret inputs |
| "The channel is TLS, so messages are bound to the session" | TLS authenticates an endpoint, not a protocol instance, round, or role. A corrupted party is a legitimate endpoint and can replay messages from another session or round |

## Core Review Areas

1. Claimed adversary model and output guarantee versus the checks present
2. Participant authentication and role binding
3. Transcript/session separation across rounds and retries
4. OT input consistency, sender/receiver role correctness, extension checks
5. Garbled circuits: label freshness, gate-hash assumptions, selective failure
6. Share MAC/commitment checks before reconstruction; canonical field values
7. Offline/online phase separation and Beaver triple authenticity
8. Abort, fairness, and broadcast consistency

## Workflow

### Phase 1: Protocol phase mapping

- Read `references/mpc-checklist.md` and `references/spec-sources.md`; pin
  the governing paper and the claimed adversary model
- Enumerate setup, offline, and online phases for each participant role

### Phase 2: Share, transcript, and OT review

- Execute `workflows/share-validation-review.md`: share validation before
  any reconstruction, session-specific and replay-resistant transcript
  identifiers, participant role binding in every message handler
- Execute `workflows/garbling-and-ot-review.md` when the target garbles
  circuits or uses OT, including OT-based preprocessing

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize unchecked share use, OT role confusion, unauthenticated
  triples, selective failure, and output released before verification

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route threshold ECDSA to `threshold-ecdsa-auditor`, DKG and
  threshold Schnorr/BLS to `dkg-threshold-auditor`, randomness lifecycle
  to `randomness-auditor`, protocol-paper deltas to `spec-delta-checker`

## Output Contract

Produce an MPC handoff listing each candidate with:

- `protocol_phase_and_role` (setup, offline, or online; participant role)
- `component` (OT, share, triple, garbled-circuit, reconstruction, session)
- `security_model_claimed`
- `invariant_at_risk` (the session-binding or share-validation rule)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/mpc-checklist.md](references/mpc-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/share-validation-review.md](workflows/share-validation-review.md)
- [workflows/garbling-and-ot-review.md](workflows/garbling-and-ot-review.md)
