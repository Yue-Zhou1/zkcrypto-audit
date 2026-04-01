# Vulnerability Taxonomy

Canonical vocabulary for classifying ZK vulnerabilities. Used by `build_index.py`
(to normalize upstream entries) and `contribute_bug.py` (to validate new entries).

All Phase 2 skills MUST use these keys when classifying findings.

## Vulnerability Types

| Key | Description | Common Aliases (normalized on ingest) |
|-----|-------------|---------------------------------------|
| `under_constrained` | Signal/variable not fully constrained; malicious prover can set arbitrary value | "missing constraint", "unconstrained witness", "assigned but not constrained" |
| `over_constrained` | Constraint system rejects valid inputs; completeness violation | "completeness violation", "false rejection" |
| `fiat_shamir_weak` | Transcript incomplete, misordered, or missing domain separation | "frozen heart", "weak fiat-shamir", "incomplete transcript" |
| `nonce_reuse` | Randomness reused across operations enabling key recovery | "deterministic nonce", "repeated randomness" |
| `arithmetic_overflow` | Field/integer overflow or underflow in circuit arithmetic | "modular overflow", "wrap-around", "field overflow" |
| `missing_range_check` | Value not bounded to expected bit-width or range | "range violation", "missing bounds check" |
| `missing_nullifier` | Double-spend, replay, or duplicate action possible | "missing uniqueness check", "replay attack" |
| `trusted_setup_leak` | Toxic waste exposure, SRS misuse, or ceremony flaw | "ceremony violation", "CRS misuse" |
| `prover_input_injection` | Prover controls witness/advice values without validation | "malicious prover input", "unvalidated advice" |
| `lookup_table_mismatch` | Lookup argument references wrong table or incorrect entries | "table mismatch", "lookup misconfiguration" |
| `missing_public_input` | Value that should be public is witness-only; verifier cannot check it | "hidden public input", "missing instance variable" |
| `soundness_error` | General proof system soundness violation not covered above | "forgery", "fake proof" |
| `privacy_leak` | ZK property violated; proof reveals private information | "information leakage", "witness extraction" |
| `subgroup_attack` | Missing curve point validation enabling small-subgroup attack | "missing subgroup check", "point validation" |
| `timing_side_channel` | Secret-dependent timing in prover or verifier code | "variable-time operation", "timing leak" |
| `configuration_error` | Wrong parameters, feature flags, or build configuration | "misconfiguration", "wrong curve parameters" |

## Impact Categories

| Key | Description |
|-----|-------------|
| `Soundness` | Invalid proofs can be accepted — most critical |
| `Completeness` | Valid proofs are rejected — denial of service |
| `Privacy` | ZK property broken — private inputs revealed |
| `DoS` | System availability impacted without soundness/privacy loss |

## Severity Mapping

| Severity | Criteria |
|----------|----------|
| `Critical` | Soundness break: fake proofs accepted, funds stolen, forgery possible |
| `High` | Privacy leak in production, practical exploit with moderate complexity |
| `Medium` | Completeness issue, DoS, or exploit requiring unusual conditions |
| `Low` | Configuration risk, documentation gap, theoretical concern |
| `Informational` | Best practice suggestion, no direct security impact |

## Normalization Rules

`build_index.py` applies these rules when ingesting upstream entries:

1. Lowercase the vulnerability string
2. Strip leading/trailing whitespace
3. Check against the alias map (second column above)
4. If no alias matches, attempt substring match (e.g., "constrained" → `under_constrained`)
5. If still no match, set to `unknown` and log a warning — manual review needed

The alias map is defined in `scripts/_shared.py:VULN_ALIASES`.
