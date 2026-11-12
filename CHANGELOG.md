# Changelog

All notable changes to `zkcrypto-audit` are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic
Versioning.

## [Unreleased]

### Added

- `proven-state-transition-auditor`: statement completeness review. A new
  Phase 2 in `workflows/l1-settlement-review.md` asks whether an honest user
  or integrator can prove inclusion, success, result, and order of their own
  operations from committed values and published data alone, what data
  availability publishes (state diff versus operation inputs), and which
  guarantees the replaced platform gave for free (provable receipts and logs,
  public mempool, forced inclusion). Adds pattern S15 (unprovable user
  operations), a checklist section, two rationalizations, and a
  `verifiability` field in the output contract. Later settlement phases are
  renumbered 3-7.
- `crypto-audit-context`: `references/roles-and-guarantees.md` now adds
  non-adversarial consumers (users and integrators) to the actor table and
  lists the implicit guarantees of a replaced platform as promises that need
  an enforcing mechanism.
- `scripts/sync.py`: generates the plugin manifests, the Codex marketplace,
  and `agents/openai.yaml` from `SKILL.md` frontmatter and
  `.claude-plugin/marketplace.json`. `--check` validates frontmatter, in-skill
  paths, routing-matrix coverage, and example sessions. CI, the release
  workflow, and the pre-push hook run it.
- Session-state schema v3 and a session template in `crypto-audit-router`.
- `examples/engagements/` and `examples/walkthrough.md`.
- `references/spec-sources.md` in 17 more skills.
- Workflows: `fri-review.md` (`commitment-scheme-auditor`),
  `garbling-and-ot-review.md` (`mpc-auditor`), `guest-boundary-review.md`
  (`zkvm-auditor`).
- A "Rationalizations to Reject" table and a structured output contract in
  every domain auditor.
- Install instructions for the Codex marketplace and the `skills` CLI.

### Changed

- Session state: `candidates` and `routes` replace `open_findings`,
  `verified_findings`, `fp_check_verdicts`, and `route_dispositions`. Status
  and severity are enums. The `indexing_in_progress` phase is removed.
- Audit output is written to `.zkcrypto-audit/<engagement-id>/`
  (`session.json`, `reports/`, `pocs/`) in the directory the audit runs from.
- The routing matrix, state machine, and session schema live in the
  `crypto-audit-router` skill. `plugins/_meta/` is removed.
- The completion contract moved from `AGENTS.md` to
  `workflows/full-audit-flow.md`. `CLAUDE.md` imports `AGENTS.md`.
- `zkbugs-index`: `index/`, `scripts/`, and `config/` are inside the skill
  directory. Embargoed findings are stored in
  `~/.zkcrypto-audit/zkbugs/local_findings/` (`--local-findings-dir`,
  `ZKBUGS_LOCAL_FINDINGS_DIR`, or `local_findings_dir`) and excluded from
  rebuilt shards. Prior-art lookup is allowed during domain review;
  contributing an entry is an optional closeout step.
- `crypto-report-writer`: one template with audience sections replaces four.
- Rewritten to the structure of the newer skills: `fiat-shamir`,
  `commitment-scheme`, `hash-function`, `merkle-tree`, `encryption-scheme`,
  `ecc-pairing`, `mpc`, `vdf`, `dkg-threshold`, `fhe`, `lattice`, `dependency`,
  `side-channel`, `gnark`, `noir`, `cairo`, `folding-scheme`, `zk-circuit`,
  `zkvm`.
- Scope: `rust-crypto-safety` covers Rust-specific hazards and routes timing
  analysis to `side-channel-auditor` and dependency review to
  `dependency-auditor`. `zk-circuit-auditor` routes transcript review to
  `fiat-shamir-auditor` and polynomial-commitment soundness to
  `commitment-scheme-auditor`.
- Codex packaging uses the documented formats for
  `.agents/plugins/marketplace.json`, `.codex-plugin/plugin.json`, and
  `agents/openai.yaml`.
- `allowed-tools` is a space-separated string in every skill.
- `README.md` reduced to an introduction, the flow, the plugin list, and a
  quick start.
- Technical content checked against primary sources (RFCs, NIST FIPS and SPs,
  EIPs, ePrint, RustSec and GitHub advisories, official documentation and
  project source) and corrected in every skill. Larger corrections:
  - `ethereum-crypto-auditor`: BN254 base-field modulus, ECMUL scalar range,
    precompile failure semantics, recovery-ID meaning, low-s enforcement,
    EIP-2537 operations and subgroup rules, EIP-4844 versioned hash and
    evaluation point.
  - `onchain-verifier-auditor`: G2 coefficient order in EIP-197 and EIP-2537;
    snarkjs versions with missing or wrong public-input range checks.
  - `pqc-kem-auditor`, `pqc-signature-auditor`: FIPS 203 differences from
    round-3 Kyber and from the draft, delegable input checks, randomness
    strength per parameter set, `ct0` bound, WOTS+ checksum, SP 800-208
    private-key export rule, Falcon attack attributions.
  - `fault-injection-auditor`, `pqc-signature-auditor`: SLH-DSA fault outcome
    and countermeasure.
  - `vrf-auditor`: properties provided by ECVRF key validation, separator
    octets, RFC 9381 scope.
  - `commitment-scheme-auditor`: status of the up-to-capacity proximity-gap
    conjectures.
  - `vdf-auditor`: low-order-element test procedure.
  - `zk-circuit-auditor`: plonky2, halo2, arkworks, and STARK pattern files.
  - `formal-verification-bridge`: tool matrix for Ecne, Picus, Circomspect.
  - `threshold-ecdsa-auditor`: Alpha-Rays and BitForge attribution; Paillier
    modulus proofs in GG18, GG20, and CGGMP21.
  - `rust-crypto-safety`, `kani-harness-gen`, `fuzz-harness-gen`: clippy lint
    names and flags, timeout and iteration-limit commands, a fuzz target
    example.

### Removed

- `.codex/skills/` stubs.
- `.agents/plugins/marketplace.schema.json`.
- `zk-findings/`. Its contents moved to `examples/engagements/` without local
  paths.
- Twelve `zkbugs-index` entries from `data/external_findings/`. The
  repositories they cite do not exist. The index holds 140 entries, all from
  zksecurity/zkbugs.

### Fixed

- `crypto-audit-router` referenced `plugins/_meta/*.yaml` and
  `zk-findings/sessions/session-state-schema.json`, which are absent from an
  installed plugin.
- `zkbugs-index` rebuilds merged embargoed local findings into the shards.
- `.agents/plugins/marketplace.json` carried version `0.1.0`.
- `.gitignore` listed the tracked `upstream_raw/zkbugs_snapshot.json`.

## [0.7.1] - 2026-09-16

### Fixed

- Per-plugin `version` fields in every `plugin.json` and in the marketplace
  `plugins[]` entries were left at `0.1.0` across releases 0.2.0-0.7.0. Because
  `claude plugin update` compares version strings, installs stayed pinned to the
  first release and silently missed every skill added since. All seven plugins now
  declare `0.7.1`, matching `metadata.version`.

## [0.7.0] - 2026-09-14

### Added

- `proven-state-transition-auditor` (zk-and-vm-auditors): audits applications
  proven inside a zkVM or circuit and settled on L1. Three workflows: a
  prover-input authority matrix over every batch operation and input field
  (source, binding, and the omitted/duplicated/reordered/empty/identity
  outcomes, with a mandatory sibling sweep), a sparse-witness review
  (single-key, aggregate, insert-only, and inner-node completeness with a
  two-witness closing argument), and an L1 settlement review (public-value
  consumers, time floor and ceiling, queue ordering and contiguity, skip
  semantics, the force-includable set, deadman defaults, payout-loop gas and
  token hazards). Routed by `proven_state_transition_settlement`.
- `crypto-audit-context`: `references/roles-and-guarantees.md`, an actor
  table (prover, submitter, oracle signer, owner, delegated key holder,
  depositor) recording what each role is promised to others and the
  mechanism that enforces it; unenforced promises become domain candidates.
  Intake now recommends `fuzz-harness-gen` when hand-rolled fixed-point or
  bignum arithmetic sits on a value path.

### Changed

- `crypto-fp-check`: soundness candidates (prover input, witness
  completeness, missing authorization) can no longer be dismissed "by
  construction"; a FALSE POSITIVE needs a recorded adversarial construction
  attempt or a rejecting check per malformed-input class. A TRUE POSITIVE in
  one dispatch arm requires a sibling sweep before it is complete.
- `audit-common` severity framework: added a High (liveness) row for
  defeated forced-exit and forced-inclusion guarantees.
- `merkle-tree-auditor`: sparse-witness section (empty-leaf bypass,
  insert-only paths, sentinel substitution, iteration is not completeness).
- `rust-crypto-safety`: guest build profile (`overflow-checks`) and
  guest-panic classification.
- `dependency-auditor`: `rev` versus mutable `tag`/`branch` pins; patch-table
  effectiveness via `cargo tree` on the guest target.
- `zkvm-auditor`: proving-cost and liveness section; defers application
  logic to `proven-state-transition-auditor`.
- `spec-delta-checker`: Phase 5 internal drift (doc comments, constants,
  test names) and accepted-risk registers treated as hypotheses.
- `crypto-audit-context` threat-model checklist: nonce scope versus
  authority scope.
- Skill count 42 -> 43 across README, CLAUDE.md, AGENTS.md, and manifests.

## [0.6.0] - 2026-07-13

### Added

- `fix-verification` (core-audit-flow): verifies that a supplied patch actually
  fixes a previously verified finding — reproduces the original PoC on the
  vulnerable revision, confirms it fails for the intended reason on the fixed
  revision, checks the root cause (not just the demonstrated input) is removed,
  searches sibling paths for incomplete remediation, runs regression tests, and
  records a `remediation_verifications` verdict. Routed by
  `fix_verification_patch_regression`.
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

### Changed

- Session state schema upgraded to version 2 (`schema_version: 2`): a strict
  core contract (including `route_dispositions`, `fp_check_verdicts`,
  `artifacts`, and `remediation_verifications`) plus an `extensions` object that
  preserves engagement-specific evidence. Adds the `remediation_in_progress`
  phase and its transitions. All tracked engagement sessions were migrated.

### Removed

- Root `scripts/` and `tests/` maintainer-only scaffolding (routing-doc
  generation, Codex stub sync, skill-count sync, session-schema validation,
  and skill-eval fixtures), along with the CI/pre-push steps that ran them.
  None of this tooling is read by an LLM during an audit; it only validated
  repo self-consistency for maintainers. `.codex/skills/*` stubs and the
  generated regions in `routing-matrix.md`/`full-audit-flow.md` are now
  maintained by hand instead of generated/checked.
  `plugins/evidence-and-tooling/scripts/` (zkbugs-index tooling) is
  unaffected since it runs at skill invocation time, not just in CI.

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
