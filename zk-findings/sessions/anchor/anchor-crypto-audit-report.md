# Anchor SSV Client — Cryptographic Security Assessment

**Engagement:** anchor-crypto-2026-07-10
**Target:** Anchor (Secret Shared Validator client), branch `stable`
**Scope:** BLS12-381 threshold signing surface — Shamir/Lagrange key split & signature
combination (`bls_lagrange`), partial-signature collection & reconstruction
(`signature_collector`), gossip message validation (`message_validator`), key-share
encryption (`keysplit`, `validator_store`).
**Method:** Staged crypto audit (context → domain review → spec-delta → verification →
report). No ZK circuits are present in the codebase; ZK-specific auditors and the
zkbugs prior-art index were not applicable and were skipped (see Closeout).

---

## Executive Summary

Anchor's threshold-signature reconstruction diverges from the SSV protocol
specification in a way that lets a **single Byzantine committee operator persistently
deny a validator's beacon-chain duties**. Anchor combines partial BLS signatures as soon
as `threshold` distinct operators have responded, **without verifying each partial
signature against that operator's share public key** and **without the spec's
"verify-each-and-evict" fallback**. Because the reconstructed signature is also not
verified locally before use, one bad partial from an authenticated committee member
silently produces an invalid aggregate that the beacon node rejects — the validator
misses its attestation/proposal/sync duty, with no retry from the honest share subset.

This is a **liveness/griefing (Medium)** issue, not signature forgery: the invalid
aggregate is rejected downstream, so no funds or slashing-by-forgery are at risk, but
duties fail and attestation penalties accrue. A compiled, passing proof-of-concept is
included. Four additional low/informational hardening items are documented.

---

## Findings

| ID | Severity | Title |
|----|----------|-------|
| F-1 | **Medium** | Threshold reconstruction lacks per-share verification and spec fallback → single operator denies duties |
| F-2 | Low | `blst` backend skips subgroup check on network signatures (diverges from `blsful` backend) |
| F-3 | Low | Decrypted BLS key share not zeroized |
| F-4 | Informational | Intermediate secret share not zeroized on a dead error path |
| F-5 | Informational | Key shares encrypted with RSA PKCS#1 v1.5 (no oracle present) |

---

### F-1 — [Medium] Threshold reconstruction lacks per-share verification and spec fallback

**Security property affected:** Availability (liveness / DoS).

**Affected scope:** [`signature_collector/src/lib.rs`](../anchor/signature_collector/src/lib.rs#L499-L559),
consumed by [`validator_store/src/lib.rs`](../anchor/validator_store/src/lib.rs#L382-L430)
for every duty type (proposer, attester/committee, sync committee, aggregator,
validator registration, voluntary exit).

**Preconditions:** The attacker is an authenticated operator in the target validator's
committee. Their gossip message passes Anchor's existing checks (RSA envelope signature
over the SSV message, committee membership, slot/duty timing). Only the **inner BLS
partial signature bytes** are attacker-chosen.

**Root cause.** In the collector task
([lib.rs:499-546](../anchor/signature_collector/src/lib.rs#L499-L546)), partial
signatures are stored in a map keyed by `operator_id`. Once
`signature_share.len() >= threshold`, `combine_signatures` runs Lagrange interpolation
over whatever points are present. There is:

1. no verification that operator *i*'s partial signature is valid under share public
   key *i* for the signing root;
2. no verification of the **reconstructed** signature before it is cached and returned
   ([lib.rs:530-545](../anchor/signature_collector/src/lib.rs#L530-L545)); and
3. no fallback that, on failure, verifies each partial, evicts invalid ones, and
   recombines from the honest subset.

The consuming path builds the signed block directly from the returned signature
(`to_signed_block(signature)`) with no local verify
([validator_store/src/lib.rs:419-430](../anchor/validator_store/src/lib.rs#L419-L430)).

**Specification delta.** The SSV spec (`ssvlabs/ssv-spec`) reconstructs, verifies the
result against the validator public key, and on failure calls
`FallBackAndVerifyEachSignature`, which runs `verifyBeaconPartialSignature(operatorID,
signature, root, committee)` and **removes invalid partial signatures from the
container** so reconstruction can be retried with the honest ≥ 2f+1 subset. This is the
mechanism that gives SSV Byzantine-fault tolerance during reconstruction. Anchor
implements neither the fallback nor the final verification, so it loses that property.

**Impact.** With n = 3f+1 and threshold t = 2f+1, up to f malicious operators exist by
assumption. Any one of them, if among the first `t` responders for a `(signing_root,
validator_index)`, poisons reconstruction. The corrupt signature is cached and returned;
the duty fails at the beacon node. There is no retry, so the denial persists for as long
as the malicious operator participates. Result: missed attestations/proposals and
attestation penalties for the honest validator.

**Evidence — reproduced.** [`zk-findings/pocs/poc_reconstruction_poisoning.rs`](pocs/poc_reconstruction_poisoning.rs),
run against the default `blst` backend (injected into `bls_lagrange` tests, executed,
reverted — working tree left clean):

```
running 1 test
PoC OK: single Byzantine partial poisons reconstruction; no per-share verify, no fallback
test blst::tests::poc_reconstruction_poisoning ... ok
```

The PoC shows (a) `combine_signatures` returns `Ok` with one poisoned partial (no
per-share check), (b) the poisoned reconstruction fails `verify`, and (c) the honest
subset reconstructs a valid signature — the recovery Anchor never attempts.

**Remediation (priority order).**
1. On receipt, verify each partial signature against the sender's share public key for
   the signing root (in `message_validator` or `signature_collector`); reject invalid
   partials so they never enter the reconstruction set.
2. Implement the spec's fallback: on reconstruction-verify failure, verify-and-evict,
   then recombine from the remaining honest shares.
3. As a minimum backstop, verify the reconstructed signature against the validator
   master public key before returning it from `sign_and_collect`.

**Validation after fix:** add negative tests (a poisoned partial must be rejected/evicted
and a valid signature still reconstructed from the honest subset — the PoC can be
inverted into a regression test).

---

### F-2 — [Low] `blst` backend skips subgroup check on deserialized signatures

**Property:** input validation / backend consistency (enables F-1 with valid-looking
points).

`bls::Signature::deserialize` (Lighthouse, rev `a30ce6b7`) calls
`blst_core::Signature::from_bytes` → `blst_p2_deserialize`, which validates encoding and
on-curve membership but **not** r-torsion subgroup membership (that requires an explicit
`sig_validate(true)` / `subgroup_check()`). Network partial signatures therefore reach
`combine_signatures`' multi-scalar multiplication
([blst.rs:121-193](../anchor/common/bls_lagrange/src/blst.rs#L121-L193)) unchecked. The
alternate `blsful` backend uses `G2Projective::from_uncompressed`, which **does** enforce
`is_torsion_free` — the two backends diverge in strictness, and the default
(`blst_single_thread`) is the weaker one.

**Impact.** No forgery: in spec-correct usage the aggregate is verified before use, and
`fast_aggregate_verify`/`aggregate_verify` subgroup-check at verify time. The standalone
effect of accepting a non-subgroup point is the F-1 denial-of-service. Fixed naturally by
F-1 remediation (per-share verification subgroup-checks internally); otherwise call
`sig_validate(true)` on deserialization so the blst path matches blsful.

---

### F-3 — [Low] Decrypted BLS key share not zeroized

In [`validator_store/src/lib.rs:653-679`](../anchor/validator_store/src/lib.rs#L653-L679),
`key_hex: [u8; 256]` (plaintext hex of the share) and `secret_key: [u8; 32]` (raw scalar)
are plain stack arrays that are never zeroized; the decrypted `SecretKey` is additionally
cached (lifetime-extended) in `self.decrypted_keys`. Raw key-share material lingers in
process memory after decryption. Requires local memory disclosure (core dump, swap,
cold-boot) to exploit. **Fix:** wrap both buffers in `zeroize::Zeroizing`.

---

### F-4 — [Informational] Intermediate secret share not zeroized on dead error path

In [`bls_lagrange/src/blst.rs:95-108`](../anchor/common/bls_lagrange/src/blst.rs#L95-L108),
the bare `blst_scalar y` (holding partial `f(id)`) is dropped without zeroization on
`return Err(Error::ZeroId)`. The path is effectively unreachable (`KeyId::try_from`
rejects zero ids, so the Horner multiply cannot yield zero from a valid id). Noted for
completeness; zeroize `y` before the early return if the code is touched.

---

### F-5 — [Informational] Key shares encrypted with RSA PKCS#1 v1.5

Share encryption/decryption uses PKCS#1 v1.5 padding
([keysplit/src/crypto.rs:38](../anchor/keysplit/src/crypto.rs#L38),
[validator_store/src/lib.rs:655](../anchor/validator_store/src/lib.rs#L655)). PKCS#1 v1.5
is Bleichenbacher-vulnerable **only in the presence of a chosen-ciphertext padding
oracle**. Here the ciphertext originates from a local encrypted keystore/DB and is
decrypted once at startup; there is no network-facing oracle, so this is **not
exploitable** in the current deployment, and the padding matches the historical SSV
keystore format (interop constraint). Prefer RSA-OAEP if the format permits; otherwise
document the no-oracle assumption and ensure no decrypt path is ever exposed to
attacker-supplied ciphertexts.

---

## Closeout

- **Domain routes executed:** `crypto-audit-context` → `ecc-pairing-auditor`,
  `dkg-threshold-auditor`, `rust-crypto-safety`, `spec-delta-checker` →
  `crypto-fp-check` → `crypto-report-writer`. All findings passed verification; F-5 was
  downgraded to informational (no exploitable oracle).
- **Routes deliberately skipped, with reason:**
  - ZK/VM auditors (`zk-circuit-auditor`, `cairo`, `noir`, `zkvm`, `gnark`, `folding`),
    commitment/hash/Fiat-Shamir/Merkle, MPC/VDF, lattice/FHE — **no ZK circuits,
    commitments, transcripts, or those primitives exist in the codebase**.
  - `ethereum-crypto-auditor` — the eth-layer code (`eth/util.rs`) deserializes share/
    validator pubkeys and does an on-load BLS verify (`signature.verify` at
    `eth/util.rs:125`); no secp256k1/EIP-712/precompile usage in scope beyond standard
    Lighthouse types. Not a source of additional distinct crypto findings; covered under
    the ecc pass.
  - `zkbugs-index` — **not applicable**: the index is a ZK-circuit vulnerability corpus
    (circom/halo2/noir/cairo/zkVM); F-1/F-2 are BLS-threshold liveness/validation
    findings outside that taxonomy. The index was also not built locally. No prior-art
    citation is made.
  - `kani-harness-gen` / `fuzz-harness-gen` / `formal-verification-bridge` — user-
    triggered only; not invoked. The passing PoC already provides executable evidence for
    the one Medium finding.
- **Session state:** [`zk-findings/sessions/anchor-crypto-2026-07-10.json`](sessions/anchor-crypto-2026-07-10.json)
  holds the full context → domain → verified-finding chain for continuation.
