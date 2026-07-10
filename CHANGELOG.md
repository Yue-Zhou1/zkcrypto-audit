# Changelog

All notable changes to `zkcrypto-audit` are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic
Versioning.

## [Unreleased]

### Added

- `onchain-verifier-auditor` (zk-and-vm-auditors): audits Solidity/Vyper/Huff
  proof-verifier contracts for EIP-196/197/2537 precompile invocation
  semantics, missing scalar-field checks on public inputs, point encoding,
  verification-key provenance/upgrade risk, and proof calldata decoding.
  Routed by `onchain_verifier_contract`.
- `threshold-ecdsa-auditor` (protocol-auditors): audits GG18/GG20/CGGMP21/
  Lindell-style threshold ECDSA for Paillier modulus validity proofs,
  MtA/MtAwc range-proof gaps, presignature lifecycle, resharing, concurrent
  session isolation, and identifiable-abort leakage. Routed by
  `threshold_ecdsa_paillier_mta`.
- `randomness-auditor` (implementation-safety): audits CSPRNG/DRBG seeding
  and reseeding, entropy availability, fork/clone/VM-snapshot RNG
  duplication, RFC 6979/RFC 8032 deterministic nonce derivation, and nonce
  reuse across retries, crash recovery, persistence, logging, and concurrent
  state. Routed by `randomness_nonce_entropy`.
- `privacy-protocol-auditor` (protocol-auditors): audits shielded-pool and
  mixer protocol logic for nullifier derivation/uniqueness/spent-set
  soundness, note and value commitment binding, deposit/withdraw
  front-running, root acceptance, and cross-domain replay. Routed by
  `privacy_nullifier_shielded_pool`.
- `signature-scheme-auditor` (crypto-primitive-auditors): audits classical
  signatures — generic ECDSA across curves, Schnorr/BIP-340, EdDSA/Ed25519,
  RSA-PSS and PKCS#1 v1.5 — for verification-equation correctness,
  malleability, canonical encoding, public-key validation, and hash/prehash
  semantics. Routed by `classical_signature_verification`.
- `zk-circuit-auditor` extension: generic STARK/AIR coverage — AIR
  transition/boundary constraints, trace padding and selectors, composition
  polynomial degree accounting, FRI query schedule and soundness budget,
  DEEP out-of-domain sampling, and verifier parameter provenance — via
  `references/stark-air-patterns.md`, `references/spec-sources.md`, and
  `workflows/stark-air-review.md`; the `zk_constraints_transcript_verifier`
  predicate now names STARK/AIR/trace/composition review.
- `vrf-auditor` (protocol-auditors): audits RFC 9381 VRFs (ECVRF and
  RSA-FDH-VRF) for key validation, ciphersuite domain separation,
  encode-to-curve and cofactor handling, deterministic prover nonces,
  proof-to-hash ordering, uniqueness/pseudorandomness assumptions, and
  application-level output grinding. Routed by
  `vrf_rfc9381_output_grinding`.
- `pqc-kem-auditor` (post-quantum-auditors): audits ML-KEM/FIPS 203
  implementations for encapsulation/decapsulation conformance, implicit
  rejection, input validation, compression/rounding, and
  decapsulation-failure oracle resistance; boundary with `lattice-auditor`
  (generic LWE/RLWE parameter and sampler reasoning) made explicit in both
  skills. Routed by `pqc_kem_decapsulation`.
- `pqc-signature-auditor` (post-quantum-auditors): audits ML-DSA
  (FIPS 204), SLH-DSA (FIPS 205), FN-DSA/Falcon (standardization status
  pinned), and stateful XMSS/LMS/HSS (NIST SP 800-208) for
  rejection-sampling correctness, verification bound enforcement, signing
  modes, and OTS index persistence/crash-recovery/backup/cloning, with a
  dedicated stateful-hash-signature workflow. Routed by
  `pqc_signature_state_management`.
- `differential-test-harness-gen` (evidence-and-tooling, user-triggered
  only): generates cross-implementation differential test harnesses with
  official-vector and Wycheproof replay, result/error normalization, and
  reproducible divergence corpora for `crypto-fp-check`. No routing rule;
  added to `user_triggered_only_exclusions`.
- `zkvm-auditor` extension: zkEVM equivalence coverage (Scroll, Polygon
  zkEVM, Linea) — EVM opcode equivalence, gas/circuit divergence,
  state/storage trie encoding, memory expansion, and precompile
  equivalence against mainnet EVM semantics — via
  `references/zkevm-patterns.md` and `references/spec-sources.md`; the
  `zkvm_guest_memory_precompile` predicate now names zkEVM equivalence.
- `fault-injection-auditor` (implementation-safety): audits active
  fault-injection attacks — RSA-CRT Bellcore faults, deterministic
  ECDSA/EdDSA differential fault analysis, verification-skip glitches,
  redundancy bypass, and verify-after-sign gaps — under a stated fault
  model, distinct from `side-channel-auditor`'s passive scope. Routed by
  `fault_injection_glitch_dfa`.

## [0.5.0] - 2026-06-12

### Added

- Halo2 gadgets audit session artifacts under
  `zk-findings/sessions/halo2-gadgets/` (2026-06-05 engagement report and
  session state).

### Changed

- The weekly `zkbugs-index` upstream diff workflow now rebuilds the index and
  opens an automated sync pull request when upstream drift is detected,
  instead of failing the scheduled run.
- Rebuilt the zkbugs index against upstream `zksecurity/zkbugs`: ingested 31
  new entries (panther-core, zkemail, circom-rln, keyless-zk-proofs, and
  others) and dropped 2 entries removed upstream (111 -> 139 upstream
  entries, 151 total).

## [0.4.0] - 2026-04-28

### Added

- Codex-native plugin packaging manifests under `plugins/*/.codex-plugin/plugin.json`.
- Codex marketplace registry and schema under `.agents/plugins/`.
- Machine-readable orchestration metadata under `plugins/_meta/`:
  - `codex-skill-registry.yaml`
  - `router-matrix.yaml`
- Codex UI/discovery metadata files for all skills under
  `plugins/*/skills/*/agents/openai.yaml`.
- Stub synchronization/check utility: `scripts/sync_codex_stubs.py`.
- Router state transition reference:
  `plugins/core-audit-flow/skills/crypto-audit-router/references/state-machine.md`.
- Codex documentation:
  - `docs/codex/architecture.md`
  - `docs/codex/usage.md`
- Codex orchestration scaffolding test suite:
  `tests/test_codex_orchestration_scaffolding.py`.
- `AGENTS.md` audit completion contract for Codex staged audit runs.
- Local engagement state and report artifacts for Commit-Boost and Signal
  Ethereum audit sessions, including a Signal Ethereum replay PoC artifact.

### Changed

- CI and pre-push guardrails now run
  `python3 scripts/sync_codex_stubs.py --check`.
- `.codex/skills/*` stubs are now generated from the machine-readable registry
  and remain valid backward-compatible invocation paths.
- Router documentation now references machine-readable orchestration sources and
  explicit session-state phase transitions.
- `crypto-fp-check` verification gates now require stronger report and PoC
  artifact alignment for higher-severity claims.
- README and Claude/Codex project guidance now emphasize complete staged audit
  execution, session state, candidate dispositions, and report closeout.

## [0.3.0] - 2026-04-07

### Added

- New `ethereum-crypto-auditor` domain skill for Ethereum-focused Rust crypto
  review (ECDSA/secp256k1, keccak/EIP-712, precompiles, KZG/EIP-4844, and API
  misuse patterns).
- New `folding-scheme-auditor` domain skill for Nova/HyperNova/ProtoStar/Sonobe
  folding and IVC review.
- `zk-circuit-auditor` library-specific references for Halo2, arkworks, and
  plonky2/plonky3 pattern hunting.
- `side-channel-auditor` ZK prover-side leakage reference file
  (`zk-prover-patterns.md`).
- Codex compatibility stubs for `ethereum-crypto-auditor` and
  `folding-scheme-auditor`.

### Changed

- Expanded routing matrix coverage to include Ethereum-crypto and folding-scheme
  routes.
- Strengthened scaffolding tests to lock new skill files and routing-bullet
  references.
- Updated collection documentation to reflect 7 category plugins / 31 skills.

## [0.2.0] - 2026-04-02

### Changed

- Reorganized packaging from 29 flat plugins into 7 category plugins containing
  the same 29 skills.
- Consolidated `.claude-plugin/marketplace.json` from 29 plugin entries to 7
  category entries.
- Updated Codex compatibility stubs, CI/hook paths, and tests for the new
  category-based layout.
- Moved `zkbugs-index` scripts/config/index/data under
  `plugins/evidence-and-tooling/`.

## [0.1.0] - 2026-03-30

### Added

- Initial marketplace-ready plugin collection with 11 plugins.
- Root marketplace manifest and plugin scaffolding tests.
- `zkbugs-index` CLI tooling for indexing, querying, and promoting findings.
- Codex compatibility stubs under `.codex/skills/`.
