# codeX Anchor Crypto/ZK Security Audit Report

Engagement: `codeX-anchor-crypto-2026-07-10`
Revision: `72e0705db96c2e636a835b0bdbd6cb7d4d6831d8`
Date: `2026-07-10`

## Executive Summary

The audit found one Medium cryptographic availability issue in Anchor's threshold BLS reconstruction path: an authenticated Byzantine operator can submit an invalid partial signature that poisons the first threshold set. Anchor reconstructs and caches the invalid aggregate without verifying the final signature or evicting the bad share. The SSV reference flow verifies reconstructed signatures and contains invalid-share fallback behavior.

The review also found one Low secret-memory hygiene issue in decrypted share handling and one Low dependency remediation item from RustSec. No native ZK circuit/prover/verifier implementation was present, so ZK circuit, transcript, Merkle, commitment, folding, zkVM, Cairo, Noir, gnark, VDF, FHE, and lattice routes were skipped with evidence in `zk-findings/codeX-domain-review-evidence.md`.

`zkbugs-index` was evaluated and skipped because the verified findings are threshold BLS/dependency issues, not taxonomy-applicable ZK circuit bugs.

## Findings

### [Medium] CX-01: Unverified partial signatures can poison threshold reconstruction

Severity: Medium
Security property affected: availability / completeness
Affected scope: `anchor/message_validator`, `anchor/signature_collector`, `anchor/common/bls_lagrange`

Summary: Anchor authenticates the operator envelope for partial-signature messages, but it does not verify the inner BLS partial signature against that operator's share public key. The collector stores the first signature per operator ID, reconstructs as soon as the count reaches threshold, and returns/caches the reconstructed signature without final verification. One Byzantine operator among the first threshold responders can therefore cause an invalid reconstructed signature and deny the validator duty.

Root cause:

- `anchor/message_validator/src/partial_signature.rs:20-75` verifies message semantics and the RSA operator envelope, not the inner BLS share.
- `anchor/signature_collector/src/lib.rs:263-305` forwards partial signatures to the collector by signer/operator ID.
- `anchor/signature_collector/src/lib.rs:463-558` combines the first threshold set and never calls final `Signature::verify` before notifying waiters.

Reference delta: `ssvlabs/ssv-spec` commit `5d11f26bc776d208cf33ad8a0e4ee4973e991568` verifies reconstructed signatures in `ssv/partial_sig_container.go:87-112` and has fallback invalid-share eviction in `ssv/runner_validations.go:43-54`.

Proof: `zk-findings/pocs/codeX-reconstruction-poisoning.rs` was executed temporarily as a native Rust test:

```text
test blst::tests::poc_codex_cx01_reconstruction_poisoning ... ok
test result: ok. 1 passed; 0 failed
```

Impact: a single malicious authenticated operator can prevent successful beacon-duty submission whenever its invalid share is included in the first threshold set. The PoC demonstrates DoS/completeness failure, not signature forgery.

Remediation:

- Verify each partial signature against the stored share public key before accepting it into the collector, or verify and evict invalid shares when reconstructed signature verification fails.
- Verify the reconstructed signature against the validator public key before caching or notifying consumers.
- Preserve enough candidate shares to continue after evicting invalid ones.
- Add regression tests for invalid quorum followed by valid quorum, mirroring the SSV spec tests.

### [Low] CX-03: Decrypted key-share buffers are not zeroized

Severity: Low
Security property affected: local secret hygiene
Affected scope: `anchor/validator_store/src/lib.rs:647-680`

Summary: `decrypt_key_share` decrypts the RSA-encrypted share into a stack buffer, decodes the raw 32-byte BLS secret key into another stack buffer, and returns a deserialized `SecretKey`. The temporary plaintext buffers are not zeroized before returning.

Impact: local process-memory disclosure after this function returns may recover share material from stack residue. No remote exploit path was found, and the returned `SecretKey` is intentionally retained for validator operation.

Remediation:

- Wrap `key_hex` and `secret_key` in `zeroize::Zeroizing` or explicitly zeroize them after deserialization.
- Avoid logging decrypted data; current logs do not print plaintext share bytes.

### [Low] CX-06: RustSec vulnerability in crossbeam-epoch 0.9.18

Severity: Low
Security property affected: dependency hygiene / memory safety defense in depth
Affected scope: `Cargo.lock`

Summary: `cargo-audit` reported `RUSTSEC-2026-0204` for `crossbeam-epoch 0.9.18`. The patched version is `>=0.9.20`. The dependency is reachable through `crossbeam-deque -> rayon-core -> rayon`, including `keysplit` and transitive Lighthouse KZG/type paths.

Impact: the advisory concerns invalid pointer dereference in `fmt::Pointer` for invalid `Atomic`/`Shared` pointers. No Anchor-specific formatting of these crossbeam pointer types was found, so practical impact is Low, but the dependency should be updated.

Remediation:

- Upgrade the dependency graph so `crossbeam-epoch >=0.9.20` is selected.
- Re-run `/tmp/codeX-cargo-tools/bin/cargo-audit audit --json` or the project's normal advisory workflow after the update.
- Track informational audit warnings for `anyhow`, `lru`, `rand`, `derivative`, `paste`, and `proc-macro-error2` during dependency maintenance.

## Candidate Notes

The full candidate disposition table is in `zk-findings/codeX-candidate-dispositions.md`.

Key non-reported candidates:

- `CX-02` BLST subgroup/deserialization divergence was consolidated into `CX-01`; it is evidence of the validation gap but not an independent exploit in this codebase.
- `CX-04` scalar zeroization on an unreachable error path failed the trigger-path gate.
- `CX-05` RSA PKCS#1 v1.5 share encryption did not expose a network decryption oracle in audited paths; treat as future format modernization, not a vulnerability.

## Validation

- PoC: `cargo test -p bls_lagrange poc_codex_cx01_reconstruction_poisoning -- --nocapture` passed when temporarily injected, then the production file was restored.
- Dependency audit: `/tmp/codeX-cargo-tools/bin/cargo-audit audit --json` completed and reported one vulnerability.
- Final session schema validation is recorded against `zk-findings/sessions/session-state-schema.json`.

