# Signal-Ethereum Crypto Security Review

Engagement ID: `signal-ethereum-core-host-methods-ssz-multiproofs-2026-04-28`

Scope:

- `core/`
- `host/`
- `methods/`
- `ssz-multiproofs/`

Review workflow: `crypto-audit-router` staged review with intake, spec-delta review, domain review, false-positive verification, and report writing.

## Executive Summary

The review found one verified Critical soundness issue in the core Casper FFG verification path. The verifier accepts an attacker-controlled list of attestations and sums the attesting balance once per attestation. It does not deduplicate validator indices across attestations for the same `(source, target)` link. A prover can therefore replay the same valid attestation until the calculated balance crosses the finality threshold.

This can allow a ZKasper proof to finalize a checkpoint even though the unique attesting validator stake is below the configured threshold.

## Audit Context

Highest-risk paths reviewed:

- `core/src/verify.rs::verify`
- `core/src/verify.rs::process_attestation`
- `core/src/attestation.rs::get_attesting_indices`
- `core/src/state_reader/ssz_state_reader.rs::StateInput::into_state_reader`
- `ssz-multiproofs/src/multiproof.rs::Multiproof::verify`
- `methods/guest/src/lib.rs::entry`

Primary trust boundaries:

- RISC Zero guest frame input deserialization
- Host-built `StateInput` multiproofs and state patches
- Attestation list supplied to the verifier
- Beacon RPC responses consumed by the host input builder
- SSZ multiproof descriptor, data, and value mask supplied to the guest

Routes selected by the audit router:

- `spec-delta-checker`: Casper FFG, Ethereum Electra attestation processing, and SSZ multiproof semantics
- `ecc-pairing-auditor`: BLS aggregate signature verification and public key handling
- `ethereum-crypto-auditor`: Ethereum consensus domains, roots, and beacon-chain crypto APIs
- `merkle-tree-auditor`: SSZ multiproof verification and generalized-index extraction
- `zkvm-auditor`: RISC Zero guest-host frame and journal boundary
- `rust-crypto-safety`: panic, unwrap, assert, overflow, and dependency-surface review
- `dependency-auditor`: pinned git forks, optional crypto dependencies, and missing lockfile

## Finding SE-CORE-001

### Title

`[Critical] Repeated attestations are counted multiple times toward finality`

### Severity

Critical

### Impacted Property

Soundness

### Summary

The verifier processes attestations grouped by `(source, target)` and increments `target_balance` with the balance returned by each attestation. The code does not track which validator indices have already contributed balance for that link. Because `Input.attestations` is prover-supplied and only documented as needing to be sorted, the prover can include the same valid attestation multiple times. Each replay contributes the same validator balance again.

As a result, a small amount of real attesting stake can be replayed until it satisfies the configured justification threshold, allowing an invalid finality transition.

### Affected Components

- `core/src/verify.rs::verify`
- `core/src/verify.rs::process_attestation`
- `core/src/attestation.rs::get_attesting_indices`
- `core/src/lib.rs::Input`
- RISC Zero guest input path in `methods/guest/src/lib.rs::entry`

### Root Cause

`get_attesting_indices` returns a `BTreeSet` of validator indices for a single attestation, so duplicates inside one attestation are removed. However, `verify` does not union those validator indices across every attestation in the same link group before calculating the link's attesting balance.

The implementation enforces signature validity per attestation, but it does not enforce the consensus invariant that each validator's effective balance can contribute at most once to a given target justification.

### Invariant Violated

For a single `(source, target)` justification link, the target attesting balance must be computed over the set of unique unslashed validators that attested to that link. A validator's effective balance must not be counted more than once for the same link.

### Trigger Path

1. A prover supplies `Input.attestations`; the type only documents that attestations are expected to be sorted by `(source, target)`.
2. `verify` groups adjacent attestations by `(source, target)` in `core/src/verify.rs`.
3. For each attestation in the group, `process_attestation` validates the aggregate signature and returns the attesting balance for that attestation.
4. `verify` adds each returned balance into `target_balance`.
5. The threshold check compares this inflated `target_balance` to the total active balance.
6. If the inflated balance passes the threshold, `consensus_state.state_transition(&link)` executes and may finalize the source checkpoint.

Attacker-controlled input: serialized `Input.attestations` passed to the guest or host verifier.

### Evidence

Relevant code references:

- `Input.attestations` is externally supplied and only documented as presorted: `core/src/lib.rs:79-88`.
- `verify` groups by link and initializes one `target_balance`: `core/src/verify.rs:83-111`.
- `verify` adds one balance per attestation without tracking previously counted validators: `core/src/verify.rs:112-116`.
- Threshold is checked against this accumulated value: `core/src/verify.rs:124-134`.
- `get_attesting_indices` deduplicates only within one attestation by returning a `BTreeSet`: `core/src/attestation.rs:25-58`.

Executable verification:

- A temporary integration test modeled eight active validators.
- A single valid signer occupied one committee position and produced a valid attestation.
- One copy of that attestation failed with `ThresholdNotMet`.
- Seven repeated copies of the same attestation caused `verify` to return a finalized post-state.

Command that passed during verification:

```sh
cargo +1.92.0 test -p z-core --test duplicate_attestation_replay duplicate_attestations_from_one_validator_are_counted_multiple_times
```

The PoC source used for auditor reproduction is preserved in:

- `zk-findings/pocs/SE-CORE-001-duplicate-attestation-replay.rs`

### Exploitability

The exploit path is deterministic once the prover has at least one valid attestation for the target link. The prover does not need to forge BLS signatures or modify multiproof roots. They only need to repeat an otherwise valid attestation in the serialized `Input.attestations` vector.

The issue affects both host-side verification and the RISC Zero guest, because the guest deserializes the same `Input` and calls the same `verify` function.

### PoC Status

Executable proof completed. The PoC compiled and passed after temporary dependency-resolution workarounds were applied. The source tree was restored afterward.

Full-workspace verification is currently blocked by dependency resolution without a committed lockfile:

- `ethereum-consensus -> multihash -> core2 0.4.0`
- `core2 0.4.0` is yanked

### Prior Art

No `zkbugs-index` prior-art entry was consulted or cited for this finding.

### Remediation

Change the link-level accounting to accumulate unique validator indices before summing balance. A safe shape is:

1. For each link group, maintain a `BTreeSet<ValidatorIndex>` or equivalent set of all attesting validators seen for that link.
2. For each attestation, verify the signature against the indices represented by that attestation.
3. Add the verified indices into the link-level set.
4. After all attestations for the link are verified, sum the effective balance of unique unslashed validators exactly once.
5. Use that deduplicated balance for the threshold check.

Add a regression test where the same valid attestation is repeated enough times to exceed the threshold if counted per attestation. The expected result should remain `ThresholdNotMet`.

### Residual Risk

The fix should preserve support for multiple distinct attestations that cover disjoint committees or overlapping committees. The regression suite should include:

- repeated identical attestation
- overlapping attestations with partially shared validator indices
- disjoint attestations that legitimately cross threshold
- slashed validators repeated across attestations

The remediation may change performance characteristics because it adds per-link set operations. This should be acceptable compared with BLS verification and committee computation, but it should be measured on large mainnet-sized attestation batches.

## Non-Finding Observation SE-DEP-001

### Title

`[Low] Missing lockfile and yanked transitive dependency block full-workspace verification`

### Summary

The repository does not currently include a `Cargo.lock`. During verification, full workspace resolution failed because `ethereum-consensus` depends on `multihash`, which selects yanked `core2 0.4.0`. This blocked normal `cargo test` execution for the full workspace.

### Impact

This is a tooling and reproducibility risk, not a confirmed runtime cryptographic vulnerability. It makes audit reproduction harder and allows semver drift to change transitive code under review.

### Evidence

Observed failure:

```text
error: failed to select a version for the requirement `core2 = "^0.4.0"`
  version 0.4.0 is yanked
required by package `multihash v0.16.0`
required by package `ethereum-consensus`
```

Relevant dependency edges:

- `Cargo.toml:40`
- `ssz-multiproofs/Cargo.toml:24`
- `host/Cargo.toml:27`

### Remediation

Commit a reviewed `Cargo.lock` for this application workspace or otherwise pin and reconcile the yanked dependency path. Re-run the full workspace tests after dependency resolution is stable.

## Test Evidence Matrix

- Known-answer tests: partially present in existing sync and multiproof tests
- Boundary condition coverage: incomplete for duplicate or overlapping attestation inputs
- Negative tests: missing for replayed attestations across one link
- Algebraic property tests: not applicable to this implementation-level accounting bug
- Differential testing: partial host-vs-guest checks exist, but they call the same vulnerable logic
- Fuzz target coverage: not observed
- Code coverage measurement: not observed
- Wycheproof: not applicable

## Report Suitability

This writeup is suitable for internal auditor review and engineering remediation. It is not yet suitable for public disclosure because the remediation and post-fix regression evidence are not included.

## Internal Next Steps

- [ ] Assign owner for `SE-CORE-001`
- [ ] Implement link-level validator deduplication
- [ ] Add duplicate and overlapping attestation regression tests
- [ ] Restore full-workspace reproducible dependency resolution
- [ ] Re-run host and guest verification tests after the fix
