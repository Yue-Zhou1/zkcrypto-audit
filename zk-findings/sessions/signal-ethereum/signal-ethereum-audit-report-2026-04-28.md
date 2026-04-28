# ZKasper Security Audit Report
## Signal-Ethereum — `core/`, `host/`, `methods/`, `ssz-multiproofs/`

**Engagement ID:** signal-ethereum-2026-04-28
**Date:** 2026-04-28
**Auditor:** ZK Crypto Audit Framework
**Methodology:** Full staged review — intake → domain auditors (zkvm, ethereum-crypto, merkle-tree, fiat-shamir, rust-crypto-safety) → crypto-fp-check verification → report

---

## Executive Summary

ZKasper is a RISC Zero zkVM guest that proves Ethereum Casper FFG finality. The system derives its security from a single externally-anchored trust root — `consensus_state.finalized_checkpoint.root` — and chains all verified state through SSZ Merkle multiproofs. The zkVM journal commits `(pre_state, post_state)` as the public output; downstream verifiers (bridges, light clients) consume these as proof of canonical finalization.

**One HIGH severity soundness finding** was confirmed: the RANDAO values used to derive committee shuffle seeds are accepted from the (untrusted) host without any Merkle proof binding them to the trusted checkpoint. An adversarial host can supply arbitrary RANDAO values to manipulate validator committee assignments, enabling a valid-looking ZK proof attesting to a false finalization event. This is the dominant security risk.

**Three MEDIUM findings** cover an over-permissive churn-limit heuristic in the validator-exit validation path, an OOB slice panic reachable from malformed multiproof inputs, and a supply-chain exposure from a personal fork of Lighthouse as the BLS/shuffle dependency.

**Four LOW and two INFO findings** cover additional liveness hazards, supply-chain hygiene gaps, and minor protocol concerns, none of which affect soundness.

**Two FALSE POSITIVES** were identified and closed: the inclusion of slashed validators in BLS verification (confirmed spec-correct) and the absence of a `commit_slice` size assertion (cryptographic binding makes length assertions redundant).

| ID | Title | Severity | Property |
|---|---|---|---|
| F-01 | Unproven RANDAO enables adversarial committee manipulation | **HIGH** | Soundness |
| F-02 | Over-permissive churn budget in `validate_state_patches` | **MEDIUM** | Soundness (partial) |
| F-03 | OOB slice panic in `calculate_compact_multi_merkle_root` | **MEDIUM** | Liveness |
| F-04 | Personal fork (`ec2/lighthouse`) for BLS and shuffle | **MEDIUM** | Supply-chain |
| F-05 | Multiple `unwrap()` panics on host-supplied guest input | **LOW-MEDIUM** | Liveness |
| F-06 | `legacy-arith` saturating semantics active in guest | **LOW** | Correctness |
| F-07 | Missing `Cargo.lock` in root workspace | **LOW** | Supply-chain |
| F-08 | Head-state sanity check commented out in `input_builder` | **LOW** | Liveness (host) |
| F-09 | Empty/non-reducing descriptor panics in multiproof verifier | **LOW** | Liveness |
| F-10 | `risc0-zkvm` `unstable` feature in production guest | **INFO** | Stability |
| F-11 | Frame order not asserted before deserialization | **INFO** | Liveness |

---

## Finding F-01: Unproven RANDAO Enables Adversarial Committee Manipulation

**Severity:** HIGH
**Property affected:** Soundness — false finalization proof possible

### Summary

The RANDAO values used to compute validator committee assignments are accepted from the untrusted host without any Merkle proof binding them to the on-chain beacon state. An adversarial host can supply arbitrary RANDAO values to shift committee assignments, enabling a valid ZK proof that asserts a forged `finalized_checkpoint` in the public journal.

### Affected Scope

- `core/src/state_reader/ssz_state_reader.rs` — `SszStateReader::randao_mix()` (line 304–309), `validate_state_patches()` (line 191–272)
- `core/src/state_reader.rs` — `get_seed()` (line 60–74), `get_randao_mix()` (line 49–57)
- `core/src/verify.rs` — `compute_committees()` (line 252–278)
- `core/src/guest_gindices.rs` — no `randao_mixes` gindex defined (confirms no proof path exists)

**Precondition:** The host controls all `StateInput.patches[epoch].randao_mixes` values. No additional capability is required beyond running the prover.

### Root Cause

`SszStateReader::randao_mix()` returns host-supplied RANDAO values directly:

```rust
// core/src/state_reader/ssz_state_reader.rs:304-309
fn randao_mix(&self, epoch: Epoch, index: RandaoMixIndex) -> Result<Option<B256>, Self::Error> {
    let patch = self.patches.get(&epoch).unwrap_or(&EMPTY_STATE_PATCH);
    let randao = patch.randao_mixes.get(&index);
    Ok(randao.cloned())
}
```

`validate_state_patches()` explicitly checks only `validator_exits`, never `randao_mixes`. The code acknowledges this at line 179:

```rust
// the state patches are unverified, but we have to perform some plausibility checks
self.validate_state_patches(&spec, &trusted_checkpoint, &state, &validators)?;
```

`guest_gindices.rs` contains no gindex for `randao_mixes`, confirming that RANDAO is structurally excluded from the Merkle proof chain.

The RANDAO values then flow directly into committee assignment:

```rust
// core/src/state_reader.rs:60-74 (get_seed)
let mix = self.get_randao_mix(epoch, i)?;   // host-controlled value
// SHA256(domain_type || epoch_le || mix) → seed
// seed → swap_or_not_shuffle → committee assignments
```

### Impact

An adversarial host can:
1. Select a set of cooperating validators `V` with combined effective balance ≥ 85% of the epoch total.
2. Brute-force a RANDAO value `R` such that `shuffle_list(R, all_validators)` assigns all of `V` to a single committee slot.
3. Produce a valid BLS aggregate signature from `V` over the correct signing root.
4. Feed this input to the guest; it passes all checks and emits a RISC Zero proof with a falsified `finalized_checkpoint` in the public journal.

The resulting proof is cryptographically valid and indistinguishable from a legitimate proof. Downstream consumers (L2 bridges, light clients) would accept the forged finalization.

### Evidence

- `guest_gindices.rs`: no `randao_mixes` gindex exists — structural proof that no Merkle verification is possible.
- `ssz_state_reader.rs:179`: code comment explicitly states patches are unverified.
- `ssz_state_reader.rs:304-309`: direct pass-through of host-controlled value with zero validation.
- Verified trigger path: `env::read_frame()` → `bincode::deserialize::<StateInput>()` → `into_state_reader()` → `randao_mix()` → `get_seed()` → `compute_committees()` → `swap_or_not_shuffle`.

**PoC status:** Algorithmic sketch provided. Full executable PoC requires brute-forcing a RANDAO inverse — computationally intensive but algorithmically trivial, as `swap_or_not_shuffle` is public and deterministic. The trigger path contains no hidden guards.

### Remediation

**Option A (Merkle proof — preferred):** Add `randao_mixes` fields to the `beacon_state` multiproof and extract them through the verified `extract_beacon_state_multiproof()` path. This requires adding gindices for the specific RANDAO slots needed and extending the `StateInfo` struct.

**Option B (Design acknowledgment):** If an honest-host assumption is an accepted design precondition, this must be explicitly documented in the protocol specification and enforced in the verifier interface — e.g., the on-chain verifier contract should only accept proofs from a whitelist of authorized provers. The current design provides no mechanism for a relying party to distinguish honest-host proofs from adversarial-host proofs.

**Validation plan:** After implementing Option A, add a negative test: supply a modified `randao_mixes` value that does not match the Merkle-proven state root and verify the proof fails. Add a positive test with a known RANDAO value derived from the real beacon state.

### Client Action Checklist

- [ ] Determine whether honest-host is an accepted design precondition (document in protocol spec)
- [ ] If not: implement Option A (Merkle-proven RANDAO) for all attestation target epochs
- [ ] Add negative test: tampered RANDAO rejected by guest
- [ ] Add integration test: RANDAO extracted from real beacon state produces correct committees

---

## Finding F-02: Over-Permissive Churn Budget in `validate_state_patches`

**Severity:** MEDIUM
**Property affected:** Soundness (partial) — active validator set manipulation

### Summary

The churn budget used to validate host-supplied validator exits is calculated as `2 × get_balance_churn_limit()`, where `get_balance_churn_limit()` is already the total combined activation+consolidation churn budget per epoch. This gives the host a 2× over-budget allowance for injecting validator exits, potentially deflating the quorum denominator.

### Affected Scope

- `core/src/state_reader/ssz_state_reader.rs` — `validate_state_patches()` lines 205–207

### Root Cause

```rust
// core/src/state_reader/ssz_state_reader.rs:205-207
// get_balance_churn_limit() = get_activation_exit_churn_limit() + get_consolidation_churn_limit()
// twice the churn limit seams reasonable ¯\_(ツ)_/¯
let churn = get_balance_churn_limit(spec, total_active_balance)?.safe_mul(2)?;
```

The Ethereum Electra spec defines:
- `get_balance_churn_limit(state)` = total combined per-epoch churn budget
- `get_activation_exit_churn_limit(state)` = min(MAX_ACTIVATION_EXIT_CHURN, get_balance_churn_limit)
- `get_consolidation_churn_limit(state)` = get_balance_churn_limit − get_activation_exit_churn_limit

The inline comment is factually correct — the two sub-limits sum to `get_balance_churn_limit`. Therefore, `churn = 2 × get_balance_churn_limit` is double the true per-epoch budget. An adversarial host can inject exit-epoch patches for up to twice the real on-chain churn allowance per epoch, causing the guest to consider more validators as exited than would be possible on-chain.

### Impact

Inflated exits reduce `active_validators` in subsequent epochs, shrinking `total_active_balance` and potentially the committee size. This deflates the quorum denominator, making the 85% threshold easier to satisfy with fewer attesting validators. The practical impact is bounded by the 2× multiplier and the actual validator set composition, and is most severe when combined with F-01 (RANDAO manipulation).

### Remediation

Replace the 2× heuristic with the correct Ethereum Electra spec formula. Per the spec, exits and consolidations each have their own churn sub-limit; these can be tracked separately:

```rust
// use the correct per-type churn limits
let exit_churn = get_activation_exit_churn_limit(spec, total_active_balance)?;
let consolidation_churn = get_consolidation_churn_limit(spec, total_active_balance)?;
```

Or, if exits and consolidations cannot be distinguished (as noted in the code comment), use the true total `get_balance_churn_limit` without multiplying.

**Validation plan:** Add a test with a validator set where injecting N+1 exits (beyond the real churn limit) is rejected. Verify against the Electra spec computation.

### Client Action Checklist

- [ ] Replace `safe_mul(2)?` with the correct Electra spec churn limit
- [ ] Add negative test: exit patch exceeding true churn limit is rejected
- [ ] Reference Electra spec section on `process_registry_updates` for correctness

---

## Finding F-03: OOB Slice Panic in `calculate_compact_multi_merkle_root`

**Severity:** MEDIUM (liveness/DoS)
**Property affected:** Availability — proof abort on malformed multiproof input

### Summary

`calculate_compact_multi_merkle_root()` indexes the `data` byte slice as `&data[node_index * CHUNK_SIZE..(node_index+1)*CHUNK_SIZE]` without pre-validating that `data.len() >= count_truebits(descriptor) * CHUNK_SIZE`. A host supplying a malformed multiproof (descriptor claims more nodes than `data` contains) causes a Rust slice OOB panic inside the zkVM guest, aborting proof generation.

### Affected Scope

- `ssz-multiproofs/src/multiproof.rs` — `calculate_compact_multi_merkle_root()` line 208–210

### Root Cause

```rust
// ssz-multiproofs/src/multiproof.rs:207-210
if *bit {
    stack.push(TreeNode::Leaf(
        &data[node_index * CHUNK_SIZE..(node_index + 1) * CHUNK_SIZE],  // no bounds check
    ));
```

`node_index` is incremented unconditionally each time a `1` bit is encountered in the descriptor. If the descriptor has more `1` bits than `data.len() / CHUNK_SIZE`, the slice indexing panics. Panics inside the RISC Zero guest abort proof generation without producing a meaningful error.

### Impact

An adversarial or malformed host can cause the prover to abort on any of the three multiproofs (`beacon_block`, `beacon_state`, `active_validators`). This is a DoS/griefing path with no soundness consequence.

### Remediation

Add a pre-flight length check before entering the loop:

```rust
let expected_nodes = descriptor.count_ones();
ensure!(
    data.len() == expected_nodes * CHUNK_SIZE,
    Error::DataLengthMismatch { expected: expected_nodes * CHUNK_SIZE, actual: data.len() }
);
```

Similarly, the `assert_eq!(stack.len(), 1)` and `panic!("root must be computed")` paths should return `Err(Error::...)` rather than panicking, to provide graceful error propagation.

### Client Action Checklist

- [ ] Add data length pre-flight check
- [ ] Replace `assert_eq!(stack.len(), 1)` and `panic!("root must be computed")` with `Result` returns
- [ ] Add fuzzing target for `calculate_compact_multi_merkle_root` with arbitrary `(data, descriptor)` inputs

---

## Finding F-04: Personal Fork (`ec2/lighthouse`) for Core Cryptographic Primitives

**Severity:** MEDIUM (supply-chain)
**Property affected:** Integrity — unaudited fork supplies BLS signature verification and committee shuffle

### Summary

The workspace depends on a personal fork of Lighthouse (`github.com/ec2/lighthouse`) for `bls`, `beacon_types`, and `swap_or_not_shuffle` — three crates that are directly on the critical path for signature verification and committee assignment. The fork is pinned to a specific commit but is not the upstream Lighthouse repository.

### Affected Scope

- `Cargo.toml` (workspace root) — three critical dependencies

```toml
beacon_types = { package = "types", git = "https://github.com/ec2/lighthouse.git",
    rev = "d8a5e649e938740e2d1c8d58f6e162f0a2f7af9d", ... }
bls = { git = "https://github.com/ec2/lighthouse.git",
    rev = "d8a5e649e938740e2d1c8d58f6e162f0a2f7af9d" }
swap_or_not_shuffle = { git = "https://github.com/ec2/lighthouse.git",
    rev = "d8a5e649e938740e2d1c8d58f6e162f0a2f7af9d" }
```

### Root Cause

The fork introduces at minimum the `legacy-arith` feature (see F-06). Any additional modifications to BLS verification or shuffle logic relative to upstream Lighthouse are not visible without a full diff audit of the fork against upstream.

### Impact

A supply-chain compromise of the `ec2/lighthouse` repository, or undiscovered behavioral differences between the fork and upstream in BLS deserialization or shuffle semantics, could affect the soundness of signature verification or committee assignment.

### Remediation

1. Conduct a full diff audit of `ec2/lighthouse` at commit `d8a5e649` against the corresponding upstream Lighthouse commit.
2. Where possible, migrate to upstream Lighthouse releases or a well-audited fork with a clear change log.
3. If the fork must be maintained, publish the delta and the rationale for each modification.
4. Add the `Cargo.lock` for the root workspace (see F-07) to prevent transitive dependency drift.

### Client Action Checklist

- [ ] Diff `ec2/lighthouse@d8a5e649` against upstream Lighthouse at the same tag
- [ ] Document all behavioral differences
- [ ] Evaluate migration to upstream or a published fork with a public changelog
- [ ] Add root workspace `Cargo.lock`

---

## Finding F-05: Multiple `unwrap()` Panics on Host-Supplied Guest Input

**Severity:** LOW-MEDIUM (liveness/DoS)
**Property affected:** Availability — proof abort on malformed input, no soundness impact

### Summary

Three `unwrap()` calls in the guest execution path operate on host-controlled data with no graceful error handling. Any one of these causes a panic inside the zkVM guest, aborting proof generation.

### Affected Scope

- `methods/guest/src/lib.rs:26` — `bincode::deserialize::<Input<E>>(&input_bytes).unwrap()`
- `methods/guest/src/lib.rs:30` — `bincode::deserialize::<StateInput>(&ssz_reader_bytes).unwrap()`
- `host/src/conversions.rs:73` (called from guest via `into_state_reader`) — `PublicKey::deserialize(&v.public_key).unwrap()`

### Root Cause

No error propagation is implemented for deserialization failures in the guest entry point. In the zkVM context, a panic is equivalent to proof failure.

### Remediation

Propagate deserialization errors through a `Result` return path and emit a descriptive error via `env::log()` before aborting:

```rust
let input: Input<E> = bincode::deserialize(&input_bytes)
    .expect("Failed to deserialize Input: host provided malformed data");
```

For `PublicKey::deserialize`, replace `unwrap()` with `expect()` or return `Err(...)` propagated up to `into_state_reader`'s `Result` return type.

### Client Action Checklist

- [ ] Replace `unwrap()` with `expect()` and descriptive messages in guest entry point
- [ ] Consider returning `Result` from `into_state_reader` for BLS key deserialization failures

---

## Finding F-06: `legacy-arith` Saturating Semantics Active in Guest

**Severity:** LOW
**Property affected:** Correctness — silent saturation instead of overflow errors on `Epoch`/`Slot` operator overloads

### Summary

The `beacon_types` crate is imported with `features = ["legacy-arith"]` in `core/Cargo.toml`, which is transitively included in the guest. This feature enables `+`, `-`, `*` operator overloads on `Epoch` and `Slot` types that use `saturating_add/sub/mul` rather than returning `Result`. Code using plain `+`/`-`/`*` on these wrapper types will silently saturate rather than return an arithmetic error.

### Affected Scope

- `core/Cargo.toml` — `features = ["legacy-arith"]`
- `chainspec/Cargo.toml` — same feature
- `host/Cargo.toml` — same feature

**Note:** The guest-path code in `core/src/` consistently uses `SafeArith` methods (`.safe_add()` etc.) on `u64` primitives, which are not affected by this feature. The risk is in any code accidentally using plain arithmetic operators on lighthouse wrapper types.

### Remediation

Audit all uses of plain `+`, `-`, `*` on `Epoch` and `Slot` types in `core/src/`. Once all uses are confirmed to use `SafeArith` methods, remove the `legacy-arith` feature to prevent future accidental use of saturating operators.

### Client Action Checklist

- [ ] Grep for plain `+`/`-`/`*` on `Epoch`/`Slot` types in `core/src/`
- [ ] Remove `legacy-arith` feature once confirmed safe

---

## Finding F-07: Missing `Cargo.lock` in Root Workspace

**Severity:** LOW (supply-chain hygiene)
**Property affected:** Integrity — non-reproducible builds for host and core crates

### Summary

The root workspace (`Signal-Ethereum/Cargo.lock`) is absent. Only `methods/guest/Cargo.lock` exists (the guest has its own workspace declaration). Without a root lock file, builds of `host/`, `core/`, and `ssz-multiproofs/` resolve dependencies non-deterministically to the latest semver-compatible versions.

### Remediation

Run `cargo generate-lockfile` in the workspace root and commit `Cargo.lock`. Add it to version control. Verify CI builds use `--locked`.

### Client Action Checklist

- [ ] `cargo generate-lockfile` in workspace root
- [ ] Commit `Cargo.lock`
- [ ] Enable `--locked` in CI build steps

---

## Finding F-08: Head-State Sanity Check Commented Out in `input_builder`

**Severity:** LOW (host-side liveness)
**Property affected:** Availability (host) — stale chain views may produce inputs that fail guest verification

### Summary

A sanity check in `host/src/input_builder.rs:103-111` that verifies the head state recognizes the trusted checkpoint as finalized is commented out. Without this check, the host may build an input from a stale or forked chain view; the guest would reject it (the Merkle chain enforces correctness), but the rejection produces no useful diagnostic.

### Remediation

Restore the sanity check. The check is host-side only and does not affect zkVM soundness, but it provides early failure with a useful error message.

### Client Action Checklist

- [ ] Restore and enable the head-state sanity check in `find_finalization_epoch()`
- [ ] Add a test that exercises stale head-state rejection

---

## Finding F-09: Empty or Non-Reducing Descriptor Panics in Multiproof Verifier

**Severity:** LOW (liveness)
**Property affected:** Availability — proof abort on malformed descriptor

### Summary

`calculate_compact_multi_merkle_root()` has two panic paths for malformed descriptors that cannot be triggered by a well-formed multiproof but are reachable from host-supplied data:

1. `assert_eq!(stack.len(), 1)` (multiproof.rs:245) — panics if the descriptor produces ≠ 1 stack item.
2. `panic!("root must be computed")` (multiproof.rs:247) — panics if the single stack item is `Internal` (no leaf was ever pushed).

These are a subset of the F-03 class and should be remediated together.

### Remediation

Replace both panics with `Err(Error::MalformedDescriptor)` returns. This is addressed together with F-03.

---

## Finding F-10: `risc0-zkvm` `unstable` Feature in Production Guest

**Severity:** INFO
**Property affected:** Stability — experimental APIs may change behavior between RISC Zero releases

### Summary

`methods/guest/Cargo.toml` enables `features = ["std", "unstable"]` on `risc0-zkvm = "2.1.0"`. The `unstable` feature exposes RISC Zero experimental interfaces. The version is pinned to `2.1.0`, limiting immediate risk, but any version bump would require a careful audit of which unstable APIs are exercised and whether their semantics changed.

### Remediation

Audit which `unstable` API surface the guest code actually uses. If no unstable APIs are needed, remove the feature. If specific unstable APIs are required, document them and monitor the RISC Zero release notes for stability promotions or breaking changes.

### Client Action Checklist

- [ ] Grep for `#[cfg(feature = "unstable")]` usage in `risc0-zkvm` API calls from the guest
- [ ] Remove feature if unused; document if required

---

## Finding F-11: Frame Order Not Asserted Before Deserialization

**Severity:** INFO (liveness)
**Property affected:** Availability — wrong frame order causes panic rather than graceful error

### Summary

`env::read_frame()` is called twice in `methods/guest/src/lib.rs` (lines 22–23) in a fixed order (`ssz_reader_bytes`, then `input_bytes`). If the host supplies frames in the wrong order, the `bincode::deserialize` calls will panic on type mismatch. This is a subset of F-05 and does not affect soundness.

### Remediation

This is addressed together with F-05 (replacing `unwrap()` with descriptive error messages).

---

## Closed / False Positives

**ZV-3 (CLOSED — FALSE POSITIVE): `commit_slice` size assertion missing.**
The RISC Zero journal is cryptographically bound to the proof. The verifier reads the exact bytes committed — no additional size assertion inside the guest adds security. The binding is enforced by the proof system, not by length checks.

**OF-6 (CLOSED — SPEC CORRECT): Slashed validators included in BLS verification.**
Per the Ethereum consensus spec `is_valid_indexed_attestation`, slashed validators remain eligible to sign attestations; their stake simply does not count toward the quorum balance threshold. The implementation correctly includes slashed validators in the BLS pubkey list for `eth_fast_aggregate_verify` but excludes them in the `get_total_balance` call at `verify.rs:208-211`. This is spec-correct behavior.

---

## Test Coverage Assessment

The codebase includes:
- `core/src/consensus_state.rs` — well-tested with explicit FFG test vectors including inactivity-leak cases.
- `ssz-multiproofs/src/tests.rs` — positive multiproof round-trip tests; **no malformed-input fuzzing or negative tests**.
- `core/src/state_reader/ssz_state_reader.rs` — bincode serialization test only; **no negative tests for RANDAO or churn validation**.

**Gaps:**
- No test for tampered RANDAO detection (consequence of F-01 — such a test is structurally impossible without implementing the Merkle proof path).
- No fuzz target for `calculate_compact_multi_merkle_root` with adversarial `(data, descriptor)` pairs.
- No test asserting that validator exits beyond the true churn limit are rejected.

---

## Remediation Priority

| Priority | ID | Action |
|---|---|---|
| P0 | F-01 | Decide and document honest-host assumption; if unacceptable, implement Merkle-proven RANDAO |
| P1 | F-02 | Fix 2× churn-limit heuristic to match Electra spec |
| P1 | F-03, F-09 | Add data length pre-check and replace panics with `Result` in multiproof verifier |
| P2 | F-04 | Diff-audit `ec2/lighthouse` fork; plan migration to upstream |
| P2 | F-05, F-11 | Replace `unwrap()` panics in guest with graceful error handling |
| P3 | F-06 | Audit and remove `legacy-arith` feature |
| P3 | F-07 | Commit root workspace `Cargo.lock` |
| P3 | F-08 | Restore head-state sanity check |
| P4 | F-10 | Audit and remove `unstable` feature if unused |

---

*Report generated by the ZK Crypto Audit Framework — signal-ethereum-2026-04-28*
*Session state: `zk-findings/sessions/signal-ethereum-2026-04-28.json`*
