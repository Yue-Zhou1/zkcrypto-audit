# codeX Anchor Crypto/ZK Domain Review Evidence

Engagement: `codeX-anchor-crypto-2026-07-10`
Revision: `72e0705db96c2e636a835b0bdbd6cb7d4d6831d8`
Branch: `stable`
Review date: `2026-07-10`

## Router Intake

The audited crypto surface is:

- BLS12-381 threshold splitting and Lagrange reconstruction in `anchor/common/bls_lagrange`.
- Partial signature validation/collection in `anchor/message_validator` and `anchor/signature_collector`.
- RSA operator/share-key encryption and decryption in `anchor/keysplit`, `anchor/common/operator_key`, and `anchor/validator_store`.
- Ethereum event parsing, Keccak cluster IDs, BLS signature validation for share data, and pass-through beacon KZG proof/blob fields in `anchor/eth` and `anchor/validator_store`.
- Pinned/forked cryptographic dependencies in `Cargo.toml` and `Cargo.lock`.

No native ZK circuit, prover, verifier, transcript, custom commitment verifier, Merkle implementation, zkVM, Cairo, Noir, gnark, folding, VDF, FHE, or lattice/PQ implementation was found. `rg` found KZG-related crates and fields only through Lighthouse/Ethereum blob handling; Anchor passes KZG proofs/blobs through and does not implement commitment arithmetic or verification locally.

## Spec Delta

Reference spec source: `ssvlabs/ssv-spec` cloned at commit `5d11f26bc776d208cf33ad8a0e4ee4973e991568`.

Relevant reference behavior:

- `ssv/partial_sig_container.go:87-112` reconstructs a threshold signature and then verifies it against the validator public key.
- `ssv/runner_validations.go:43-54` has `FallBackAndVerifyEachSignature`, which verifies individual partial signatures and removes invalid ones.
- `ssv/spectest/tests/runner/preconsensus/invalid_quorum_then_valid_quorum.go:15-58` and `ssv/spectest/tests/runner/postconsensus/invalid_quorum_then_valid_quorum.go:14-48` cover invalid quorum followed by valid quorum behavior.

Anchor behavior:

- `anchor/message_validator/src/partial_signature.rs:20-75` decodes partial-signature messages, enforces signer/role/duty rules, and verifies the RSA operator envelope. It does not verify the inner BLS partial signature against the operator share public key.
- `anchor/signature_collector/src/lib.rs:263-305` forwards received partial signatures to a per-root collector keyed by signing root and validator index.
- `anchor/signature_collector/src/lib.rs:463-558` stores the first signature per operator ID, logs conflicting duplicates, reconstructs as soon as `signature_share.len() >= threshold`, caches the result, and notifies waiters. It does not verify the final reconstructed signature or evict invalid shares and continue.

Delta: Anchor accepts authenticated but BLS-invalid partials into threshold reconstruction and returns/caches the resulting invalid aggregate. The SSV reference flow verifies reconstructed signatures and contains a fallback path to remove invalid partials.

## Selected Routes

### crypto-audit-context

Trust-boundary map is recorded in `zk-findings/sessions/codeX-anchor-crypto-2026-07-10.json`.

Key boundaries:

- Gossip network to partial-signature validator: an authenticated operator may still be Byzantine.
- Validated partial-signature messages to threshold collector: threshold reconstruction must tolerate up to `f` bad operators.
- Execution-layer event data to share database: share records and signatures are externally supplied.
- RSA-encrypted share to in-process BLS key: plaintext buffers are sensitive.
- Rust wrappers to BLST FFI: point/scalar layout, subgroup, aliasing, and zeroization invariants matter.
- Pinned/forked dependencies: Git revisions and feature flags are part of the trusted computing base.

### spec-delta-checker

Output: `CX-01` is a spec delta and true positive. Anchor lacks final reconstructed-signature verification and fallback invalid-share eviction present in the reference SSV flow.

### ecc-pairing-auditor

Output:

- `CX-01`: true positive. BLS partial signatures are attacker-controlled G2 points from authenticated operators. The collector combines them without share-public-key verification or final aggregate verification.
- `CX-02`: duplicate/consolidated. The default BLST backend accepts deserialized signature points before subgroup validation (`bls` uses `Signature::from_bytes`, and `blst 0.3.16` `deserialize` does not call `validate`); alternate `blsful` uses `G2Projective::from_uncompressed`. This strengthens the validation-gap evidence but does not create a separate exploit beyond `CX-01`.

### dkg-threshold-auditor

Output: `CX-01` violates the threshold reconstruction robustness invariant for `n=3f+1, t=2f+1`: a single Byzantine operator among the first threshold responders can poison reconstruction instead of being evicted and replaced by the remaining honest share.

### mpc-auditor

Output: `CX-01` is a Byzantine-share validation failure at the MPC aggregation boundary. Authenticated participant identity is treated as sufficient for share correctness.

### encryption-scheme-auditor

Output:

- `CX-05`: false positive for direct exploit. Key splitting encrypts share bytes with OpenSSL `Encrypter::new` (`anchor/keysplit/src/crypto.rs:28-69`) and decryption uses `Padding::PKCS1` (`anchor/validator_store/src/lib.rs:647-680`). No network decryption oracle was found; decryption occurs during local validator share loading/signing. This is an interoperability and modernization note, not a reportable cryptographic break in the audited paths.

### rust-crypto-safety

Output:

- `CX-01`: true positive supported by Rust code evidence and executable PoC.
- `CX-03`: low memory-hygiene issue. `decrypt_key_share` stores decrypted share hex and raw 32-byte secret key in stack arrays without zeroization before returning a `SecretKey`; the returned key is intentionally cached elsewhere. This is local-memory exposure hardening, not remote key extraction.
- `CX-04`: false positive. The `split_with_rng` early return after `blst_sk_mul_n_check` would leave temporary `y` unzeroized, but reachable inputs reject zero `KeyId`, and nonzero field multiplication cannot produce zero in this field path. No practical trigger was found.

### side-channel-auditor

Output:

- No production secret-dependent branch or timing leak with external observation was confirmed.
- `CX-03` remains a memory-hygiene finding, not a timing side-channel.

### dependency-auditor

Tool evidence:

- Temporary install: `/tmp/codeX-cargo-tools/bin/cargo-audit` after clearing cross-compiler env vars.
- Command: `/tmp/codeX-cargo-tools/bin/cargo-audit audit --json`.
- Result: exit code 1 with one vulnerability and informational warnings.

Findings:

- `CX-06`: true positive, Low. `crossbeam-epoch 0.9.18` is affected by `RUSTSEC-2026-0204`; patched version is `>=0.9.20`. It is reachable through `crossbeam-deque -> rayon-core -> rayon`, including `keysplit` and Lighthouse KZG/type dependencies. No Anchor-specific formatting of `crossbeam_epoch::Atomic` or `Shared` was found, so the practical severity is Low dependency hygiene.
- Informational warnings: `derivative`, `paste`, `proc-macro-error2` unmaintained; `anyhow`, `lru 0.12.5`, `rand 0.8.5`, and `rand 0.9.2` have unsoundness advisories. No Anchor-specific exploit trigger was established for report severity, but these should be tracked during dependency upgrades.

### ethereum-crypto-auditor

Output:

- `anchor/eth/src/util.rs:27-79` validates share-data length and fixed-width parsing for BLS signatures, share public keys, and encrypted keys.
- `anchor/eth/src/util.rs:102-126` verifies the BLS signature over `keccak256(format!("{owner}:{nonce}"))`.
- `anchor/eth/src/util.rs:128-177` validates operator count, `3f+1` shape, duplicate operator IDs, and operator existence.
- `anchor/eth/src/util.rs:191-207` sorts operator IDs and computes a Keccak cluster ID over the owner and padded big-endian operator IDs.
- No local ECDSA recovery, EVM precompile verification, KZG verification, or custom Ethereum cryptographic primitive implementation was found.

## Skipped Routes

| Route | Disposition | Reason |
|---|---:|---|
| zk-circuit-auditor | Skipped | No circuit DSL, constraints, witness generation, prover, verifier, or proof-system code in local source. |
| fiat-shamir-auditor | Skipped | No transcript/challenge construction. SSV threshold BLS and Ethereum Keccak paths are not Fiat-Shamir transforms. |
| hash-function-auditor | Skipped | No custom hash or ZK-friendly hash implementation. Keccak use is covered by the Ethereum route. |
| merkle-tree-auditor | Skipped | No local Merkle implementation. Search hits are a URL (`eth.merkle.io`) and transitive dependencies. |
| commitment-scheme-auditor | Skipped | KZG appears only as transitive Ethereum/Lighthouse blob/proof types; Anchor does not create, verify, or update commitments locally. |
| zkvm-auditor | Skipped | No zkVM guest, host, proof, or verifier code. |
| cairo-auditor | Skipped | No Cairo source or Sierra/CASM artifacts. |
| noir-auditor | Skipped | No Noir source or ACIR artifacts. |
| gnark-auditor | Skipped | No Go/gnark circuit code. |
| folding-scheme-auditor | Skipped | No Nova/folding/recursive proof code. |
| vdf-auditor | Skipped | No VDF code. |
| fhe-auditor | Skipped | No FHE scheme, ciphertext arithmetic, or bootstrapping code. |
| lattice-auditor | Skipped | No lattice/PQ scheme implementation. |
| kani-harness-gen | Skipped | User requested PoC/proof gates, but no High/Critical Rust invariant required Kani. Native PoC covered the verified Medium issue. |
| fuzz-harness-gen | Skipped | No parser/malformed-input claim required fuzzing to resolve. Native structural review and PoC were sufficient for the surviving findings. |
| formal-verification-bridge | Skipped | No formal proof obligation remained after FP checks; no High/Critical claim depended on formal verification. |
| zkbugs-index | Skipped | Evaluated after FP checks. Surviving findings are threshold BLS/dependency issues, not taxonomy-applicable ZK circuit bugs. |

