# codeX Candidate Dispositions

Engagement: `codeX-anchor-crypto-2026-07-10`

## CX-01 - Unverified partial signatures poison threshold reconstruction

Verdict: TRUE POSITIVE
Severity: Medium
Impacted property: availability / completeness of validator duties
Routes: spec-delta-checker, ecc-pairing-auditor, dkg-threshold-auditor, mpc-auditor, rust-crypto-safety

FP gates:

- Precise invariant: threshold reconstruction must only emit a signature valid under the validator public key and must tolerate one Byzantine operator in a 4-node, `t=3` committee.
- Attacker control: an authenticated committee operator controls its own `PartialSignatureMessage.partial_signature`.
- Trigger path: `validate_partial_signature_message` authenticates the operator envelope but not the BLS share, then `receive_partial_signatures` forwards the share to `signature_collector`, which calls `combine_signatures` once `len >= threshold`.
- Hidden validation ruled out: no `verify_partial` or share-public-key verification path was found. The collector does not call final `Signature::verify` before caching/notifying.
- Impact: a single Byzantine share among the first threshold responders produces an invalid aggregate. Anchor returns/caches it instead of evicting the bad share and continuing with the remaining honest share.
- PoC: `zk-findings/pocs/codeX-reconstruction-poisoning.rs`; executed temporarily inside `anchor/common/bls_lagrange/src/blst.rs` as `poc_codex_cx01_reconstruction_poisoning`.

Severity ceiling: Medium. The demonstrated impact is duty-level denial/completeness failure, not signature forgery or private-key extraction.

Next route: report.

## CX-02 - BLST signature deserialization lacks early subgroup validation

Verdict: DUPLICATE / CONSOLIDATED INTO CX-01
Severity: Low if tracked independently
Routes: ecc-pairing-auditor, rust-crypto-safety, dependency-auditor

FP gates:

- Evidence: Lighthouse `bls` at `crypto/bls/src/impls/blst.rs:195-197` deserializes signatures with `Self::from_bytes`. BLST `0.3.16` `src/lib.rs:1474-1491` parses encodings without calling `validate`; subgroup checks are available via `sig_validate` / `validate`.
- Anchor default backend `blst_single_thread` passes `sig.point()` into Pippenger MSM in `anchor/common/bls_lagrange/src/blst.rs:121-193`.
- Alternate `blsful` backend validates through `G2Projective::from_uncompressed` at `anchor/common/bls_lagrange/src/blsful.rs:107-125`.
- Impact by itself is bounded because `CX-01` already captures the missing share/final verification root cause and the PoC uses a valid subgroup rogue signature. No separate production exploit was proven.

Next route: consolidate evidence under `CX-01`; optionally track as hardening.

## CX-03 - Decrypted key-share buffers are not zeroized

Verdict: TRUE POSITIVE
Severity: Low
Impacted property: local secret hygiene
Routes: rust-crypto-safety, side-channel-auditor

FP gates:

- Precise invariant: temporary plaintext key-share buffers should be cleared after use.
- Trigger path: `decrypt_key_share` in `anchor/validator_store/src/lib.rs:647-680` decrypts a 2048-bit RSA ciphertext into `key_hex`, decodes a 32-byte `secret_key`, and deserializes it into `SecretKey`.
- Impact: local process-memory disclosure after the function returns may recover plaintext share material from stack residue. This does not create a remote attack path by itself, and the resulting `SecretKey` is intentionally retained for validator operation.

Severity ceiling: Low.

Next route: report as hardening.

## CX-04 - Secret scalar `y` not zeroized on `ZeroId` error in split

Verdict: FALSE POSITIVE
Routes: rust-crypto-safety, side-channel-auditor

Failed gate: trigger path. `KeyId` rejects zero at construction, and multiplication of nonzero scalar inputs in the BLS scalar field cannot yield zero. The error return after `blst_sk_mul_n_check` is not practically reachable through valid public APIs with nonzero operator IDs.

Next route: discard.

## CX-05 - RSA PKCS#1 v1.5 share encryption exposes decrypt oracle

Verdict: FALSE POSITIVE for direct exploit; informational modernization note
Routes: encryption-scheme-auditor

Failed gate: exploitability. `anchor/keysplit/src/crypto.rs:28-69` uses OpenSSL `Encrypter::new`, and `anchor/validator_store/src/lib.rs:647-680` decrypts with `Padding::PKCS1`. The audited path decrypts local/on-chain share ciphertext during validator operation; no attacker-queryable decryption oracle or adaptive error channel was found.

Next route: discard as vulnerability; optionally migrate format to OAEP in a future incompatible share format.

## CX-06 - RustSec advisory in crossbeam-epoch

Verdict: TRUE POSITIVE
Severity: Low
Impacted property: dependency hygiene / memory safety defense in depth
Routes: dependency-auditor

FP gates:

- Tool evidence: `/tmp/codeX-cargo-tools/bin/cargo-audit audit --json` returned one vulnerability.
- Advisory: `RUSTSEC-2026-0204`, package `crossbeam-epoch 0.9.18`, patched `>=0.9.20`.
- Reachability: dependency graph includes `crossbeam-epoch -> crossbeam-deque -> rayon-core -> rayon`, used by `keysplit` and transitive Lighthouse KZG/type dependencies.
- Impact: advisory concerns invalid pointer dereference in `fmt::Pointer` for invalid `Atomic`/`Shared` pointers. `rg` found no Anchor-specific formatting of those types, so no direct exploit path was confirmed.

Severity ceiling: Low.

Next route: report as dependency remediation.

