---
title: raiko2 crypto/soundness audit — guests/ and crates/
date: 2026-07-13
scope: guests/risc0, guests/sp1, crates/guests, crates/guest-common, crates/prover,
  crates/primitives, crates/primitives-shasta, crates/protocol-shasta, crates/stateless,
  crates/sgx-runtime
status: findings verified, no code changes applied
---

# raiko2 crypto/soundness audit — guests/ and crates/

## Summary

Full audit of the zkVM guest programs (RISC0 + SP1) and the workspace crates that feed
them, using the zkcrypto-audit skill framework (`crypto-audit-context` →
`ethereum-crypto-auditor` / `zkvm-auditor` / `rust-crypto-safety` / `merkle-tree-auditor`
→ `crypto-fp-check`). No soundness-breaking bug was found that lets a malformed or
malicious input produce a wrong-but-accepted proof or output commitment. The findings
below are two verified Medium-severity issues plus a handful of Low/informational
hardening items. One initially-reported High finding (SGX native-mode key) was
downgraded to Low after verification showed it is a documented, opt-in,
defaults-to-safe testing mode with no production wiring found in this repo.

| # | Finding | Verdict | Severity |
|---|---|---|---|
| 1 | `hash_commitment`/`hash_derivation` hand-roll ABI encoding instead of using the canonical encoder | TRUE POSITIVE | Medium |
| 2 | RISC0 guest crypto (`fallback_modexp`, bn254/secp256r1 delegation) untested outside real zkVM runs | TRUE POSITIVE | Medium |
| 3 | SGX `NativeProvider` uses a fixed, publicly-derivable key with no compile-time gate | TRUE POSITIVE (downgraded) | Low |
| 4 | RISC0 fake-receipt acceptance gated on `cfg!(debug_assertions)` rather than explicit config | TRUE POSITIVE (downgraded) | Low |
| 5 | Aggregation guest-common test suite lacks adversarial-case coverage | TRUE POSITIVE | Low/Informational |
| 6 | RISC0 vs SP1 aggregation verify-then-bind pattern structurally asymmetric | Informational | Informational |
| 7 | External dependency assumptions unverifiable in this checkout (`risc0-crypto-evm`, `risc0-ethereum-trie`) | Informational | Informational |

---

## 1. Hand-rolled ABI encoders bypass the canonical encoder (Medium)

**Files:** `crates/protocol-shasta/src/libhash/shasta.rs` (`hash_commitment`, ~line 70-106),
`crates/protocol-shasta/src/libhash/derivation.rs` (`hash_derivation`, line 59-160)

`hash_commitment` and `hash_derivation` manually compute ABI head/offset/tuple layout
byte-by-byte instead of calling `Commitment::abi_encode()` / `Derivation::abi_encode()`
— the pattern the sibling function `hash_proposal` correctly uses
(`shasta.rs:109-111`, via `alloy_sol_types::SolValue::abi_encode()`).

**Impact:** any future field addition/reorder to the `sol!`-defined `Commitment`/
`Derivation` structs (`crates/protocol-shasta/src/shasta/mod.rs:81-140`) will silently
desync from the manual buffer builder — no compiler error, just a wrong hash. A bug in
the manual offset arithmetic itself (e.g. a wrong cursor increment for a
variable-length array field) could in principle make two structurally different values
serialize identically, undermining the collision-resistance the outer keccak is
supposed to provide.

**Current exploitability:** `hash_committon`'s pinned-hash tests
(`libhash/mod.rs:169-233`) would catch a regression once it's introduced, mitigating
drift risk somewhat. `hash_derivation` has **no call site outside its own unit tests**
(confirmed via repo-wide grep) — it is dead code today, so this is not currently
reachable from any guest-committed output. `hash_commitment` **is** reachable from
guest-committed output via the commitment-building path.

**Recommendation:** replace both with `.abi_encode()` calls, or at minimum add a
property test asserting `hash_commitment(c) == keccak256(c.abi_encode())` /
`hash_derivation(d) == keccak256(d.abi_encode())` across randomized structures with
varying-length array fields, so a future desync fails CI immediately.

---

## 2. RISC0 guest crypto correctness relies on an opaque, untested dependency (Medium)

**File:** `guests/risc0/src/crypto.rs`

- `modexp()` (line 35-38) calls `risc0_crypto_evm::modexp(...).unwrap_or_else(|| fallback_modexp(...))`.
  `risc0-crypto-evm = "=0.1.0-rc.1"` is an external crate not vendored in this repo, so
  it's impossible to locally verify exactly when it returns `None` and hands off to the
  local `fallback_modexp`. Two independently-written modexp engines can be live in the
  same guest with no test asserting they agree.
- The functional test at the bottom of the file (line 82-84) skips all assertions
  unless `cfg!(target_os = "zkvm")`, so `cargo test` on an ordinary host exercises none
  of `bn254_g1_add`, `bn254_g1_mul`, `secp256r1_verify_signature`, or `fallback_modexp`
  — only a real zkVM proving run does, which is unlikely to run on every PR.
- No adversarial test vectors exist for this file at all (malformed point, coordinate
  ≥ modulus, scalar ≥ group order, malleable/high-s signature, invalid recovery id).

**Impact:** a regression in `fallback_modexp` or in how the `risc0-crypto-evm` FFI/
bindings marshal bytes would only surface during a full zkVM proving run, not in normal
CI. Given this crate accelerates a consensus-critical EVM precompile inside the guest,
a divergence from correct precompile semantics is a soundness bug (a proof of an
incorrect state transition would still verify).

**Recommendation:** add host-runnable unit tests for `fallback_modexp` (it doesn't
depend on `target_os = "zkvm"` and can be tested unconditionally) with adversarial
vectors matching the SP1 guest's existing BN254 test vectors; and pin/vendor or at
least document the exact version/commit of `risc0-crypto-evm` being trusted.

*(By contrast, the SP1 guest's hand-rolled BN254 field/curve arithmetic in
`guests/sp1/src/crypto.rs` was cross-checked against `revm-precompile`'s canonical
`substrate-bn`-backed implementation and matches on point-at-infinity encoding,
field-range checks, curve-membership checks, and scalar reduction — no defect found
there, though it is an unnecessary reimplementation of logic already available via the
`substrate-bn` patch already pulled into `Cargo.toml`, which is a maintenance-risk
worth simplifying away in a future cleanup.)*

---

## 3. SGX `NativeProvider`: fixed key, no attestation, opt-in only (Low — downgraded from High)

**Files:** `crates/sgx-runtime/src/tee.rs:87-114`, `crates/sgx-runtime/src/config.rs:26-56`

`NativeProvider::private_key()` returns `keccak256(b"raiko2:native-sgx-provider")` — a
fixed, publicly-derivable key — and `load_quote()` returns an empty `Vec` (no
attestation). It runs on the same `raiko2-sgx-prover` binary as the real Gramine/TEE
path, selected via `RuntimeMode::Native` (`--mode native` or `RAIKO2_SGX_MODE=native`),
with no compile-time feature separation from the production TEE path.

**Verification (this is why severity was downgraded from the initial HIGH report):**

- `RuntimeMode::Tee` is the `#[default]` for both the enum and `GlobalOpts::default()`.
- `docs/operations.md:213` explicitly documents this as an intentional feature: *"Set
  RAIKO2_SGX_MODE=native to bypass Gramine for operator/link testing."*
- Every deployment sample checked defaults to `tee`:
  `docker/.env.sgx.sample:20` → `RAIKO2_SGX_MODE=tee`,
  `docker/.env.sgx.regression.sample:41` → `RAIKO2_SGX_MODE=tee`,
  `docker/docker-compose.sgx.yml:20` and `docker-compose.sgx.regression.yml:21` →
  `RAIKO2_SGX_MODE: ${RAIKO2_SGX_MODE:-tee}`. No manifest in this repo sets `native` by
  default or wires it into a production path.
- `crates/sgx-runtime/src/startup.rs:32-43` logs the active mode (`mode: "native"`) at
  `info!` level, structured, on every startup — a native-mode deployment is observable
  in logs, not silent.

Because the dangerous path requires an explicit operator opt-in against a
secure-by-default configuration, with no evidence of production wiring, this does not
meet the bar for Critical/High under the PoC gate (no realistic attacker-reachable
trigger without an operator/deployment error first). It remains a legitimate finding
because the *option* itself has weak guardrails: no compile-time feature gate, no
startup refusal/warning-level escalation, no restriction to loopback binds, and the key
being a static string constant rather than something regenerated/salted per-deployment
increases blast radius if the option is ever mis-set.

**Recommendation:** consider gating `NativeProvider` behind a Cargo feature flag
(compiled out of the default/release image entirely) rather than a runtime enum
variant, or at minimum emit a `warn!`/refuse-to-bind-non-loopback check when native mode
is active, so a misconfiguration is loud rather than a single log line.

---

## 4. RISC0 fake-receipt acceptance keyed on `debug_assertions` (Low — downgraded from Medium)

**File:** `crates/prover/src/risc0_aggregation.rs:245-263`

`allow_fake_receipts_for_verification()` returns `true` whenever `cfg!(debug_assertions)`
is true (i.e. any non-`--release` build), or when `RAIKO_ALLOW_FAKE_RISC0_RECEIPTS` is
set. This gates whether `InnerReceipt::Fake` receipts are accepted during aggregation
input verification. When disabled, the code explicitly rejects fake receipts with a
`RaikoError::InvalidRequestConfig` ("fake RISC0 receipts are not accepted unless
explicitly enabled for development").

**Verification:** release (`cargo build --release`, which is what ships in the Docker
images per `AGENTS.md`/`docs/operations.md`) has `debug_assertions` off, so this path is
inert in the shipped artifact. The residual risk is scoped to non-release binaries
being deployed somewhere reachable (a debug CI/staging environment pointed at real
funds/state), which is a deployment-hygiene concern rather than a defect in the shipped
code path.

**Recommendation:** the sibling RISC0 mock-proof gate (`risc0/mod.rs:40-58`) is
explicit config (`config.mock`)-driven rather than build-profile-driven — align this
function to the same explicit pattern for consistency and to remove the implicit
dependency on build flags as a security boundary.

---

## 5. Aggregation entrypoint lacks adversarial test coverage (Informational)

**Files:** `crates/guest-common/tests/aggregation_validation.rs`,
`crates/guest-common/src/lib.rs` (`aggregate_shasta_zk_with_verifier`)

Only two tests exist for this entrypoint (empty vec, length mismatch). None of the
following are exercised at the guest-facing entrypoint level: `verify_proof` failure
propagation, `block_input`/`hash_shasta_subproof_input` mismatch, cross-chain
(`chain_id`) drift between carry-data items, cross-verifier drift, broken
proposal-hash chaining, or image_id substitution. The lower-level validator
(`validate_shasta_proof_carry_data_vec` in `crates/primitives-shasta/src/instance.rs`)
does have its own adversarial unit tests, but the wiring between it and the guest
entrypoint itself is untested — a future refactor could silently decouple them without
any test failing.

**Recommendation:** add guest-common-level tests that call
`aggregate_shasta_zk_with_verifier` directly with the adversarial vectors listed above,
and consider a fuzz harness (`evidence-and-tooling:fuzz-harness-gen`) over
`ShastaZkAggregationGuestInput`.

---

## 6. RISC0/SP1 aggregation verify-then-bind asymmetry (Informational)

**Files:** `guests/risc0/src/shasta_aggregation.rs:48-65`, `guests/sp1/src/shasta_aggregation.rs:21-26`

RISC0 verifies each child receipt before calling `aggregate_shasta_zk_with_verifier`
and derives `block_inputs[i]` from the already-verified receipt journal. SP1 instead
verifies *inside* the callback, explicitly binding `block_input` via a syscall digest
check. Both are currently sound, but the two backends achieve the verify→bind
invariant through structurally different code paths — a future edit to either file
(e.g., "simplifying" RISC0 to take `block_input` from host input instead of the
verified receipt journal) is one refactor away from silently breaking the binding with
no shared abstraction to prevent it.

**Recommendation:** factor both backends through a shared verify-then-bind helper in
`guest-common`, or add a regression test that would fail if `verify_proof` were ever
made a no-op with host-controlled `block_input`.

---

## 7. Unverifiable external dependency assumptions (Informational)

Two load-bearing correctness assumptions rest on external crates not vendored in this
checkout and could not be independently re-verified here:

- **`risc0-crypto-evm = "=0.1.0-rc.1"`** (see finding 2) — exact fallback-trigger
  semantics for `modexp`/bn254/secp256r1 are opaque.
- **`risc0-ethereum-trie` (git tag `v3.0.1`)**, used via `CachedTrie::from_prehashed_nodes`
  in `crates/stateless/src/sparse.rs`. Call sites wrap `.get()` in `catch_unwind` and
  treat a panic as `ProviderError::TrieWitnessError`, which implies the crate is
  expected to panic (not return `None`) when a path is unresolvable from the supplied
  witness nodes — the correct fail-closed behavior. A `None` result is only expected
  for genuine, fully-witnessed non-inclusion. This is the standard "proof absent vs.
  proof of absence" failure class and is exactly the kind of property that should be
  independently confirmed against the upstream crate's source rather than assumed.

**Recommendation:** as a follow-up (not blocking), pull and review
`risc0-ethereum-trie` v3.0.1's `Trie::get`/`from_prehashed_nodes` source directly to
confirm it fails closed on unresolvable paths, since raiko2's own code correctly
assumes but cannot locally prove this property.

---

## Areas reviewed with no issues found

- **BN254 G1 add/mul and secp256k1 ecrecover** in `guests/sp1/src/crypto.rs` — matches
  canonical `revm-precompile` v34.0.0 semantics on infinity encoding, field-range
  checks, curve-membership checks, and signature-malleability handling (`normalize_s`
  behavior is a faithful, non-diverging port of upstream `k256.rs::ecrecover`).
- **Shasta anchor progression / uint48 truncation** — `validate_anchor_progression`,
  `validate_source_aware_anchor_progression`, and `should_bypass_stalled_anchor_linkage`
  correctly gate on freshly re-derived, witness-verified parent checkpoints; the
  "bypass" path cannot be used to skip anchor validation under attacker-chosen
  conditions. `fits_shasta_uint48` gates are checked before any uint48 truncation that
  feeds hashing.
- **Cross-backend proposal-validation parity** — `prove_shasta_proposal_with_block_verifier`,
  `validate_l1_anchor_linkage`, and anchor-transaction validation are shared in
  `guest-common` and called identically from both RISC0 and SP1 guests; a prover cannot
  choose a "weaker" backend for proposal proving.
- **SGX attacker-input parsing** (`crates/sgx-runtime/src/aggregation.rs`, `proposal.rs`)
  — length/hex/signature-recovery parsing on untrusted child-proof bytes is
  `Result`-based with explicit checks before indexing; regression tests assert
  no-panic behavior on short/malformed inputs.
- **Boundless seal handling** — treats market-returned seals as opaque, relies on the
  on-chain verifier contract for final validity, consistent with Boundless's trust
  model.
- **`unsafe` usage** across `crates/sgx-runtime` and `crates/prover` — only two
  instances found, both benign test-only env-var mutation guarded by a mutex.

---

## Methodology

Audit followed the `crypto-audit-router` full-audit-flow: `crypto-audit-context` to map
trust boundaries and priorities, four domain audits run in parallel
(`ethereum-crypto-auditor`, `zkvm-auditor`, `rust-crypto-safety`, and
`merkle-tree-auditor`/`fiat-shamir-auditor` reasoning applied to the Shasta protocol
crates), followed by `crypto-fp-check` verification against the live repository state,
deployment manifests, and call-site graphs before finalizing severities above. No
`Critical`/`High` claim survived the PoC gate in its originally-reported form; the one
candidate High finding was downgraded to Low after verification.
