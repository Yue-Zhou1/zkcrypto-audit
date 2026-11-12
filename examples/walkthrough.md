# Walkthrough: Auditing a Rust Groth16 Verifier

This walks through a full audit of a Rust codebase implementing a Groth16
verifier. Each step shows the exact prompt and a condensed sample of what
skills produces.

---

## Step 1 — Start the router

```text
Use crypto-audit-router to run a complete staged crypto/ZK security audit on src/. Follow the starting prompt in the README, including session state, all applicable domain routes, false-positive checking, PoC gates, and report writing.
```

> **Router output:**
> Routing plan for this target:
> 1. `crypto-audit-context` — map trust boundaries and critical paths
> 2. `spec-delta-checker` — code claims to follow the Groth16 paper
> 3. `zk-circuit-auditor` — verifier equations and pairing checks
> 4. `ecc-pairing-auditor` — point deserialisation and subgroup membership
> 5. `rust-crypto-safety` — unsafe blocks, zeroization, constant-time
> 6. `crypto-fp-check` — verify surviving suspected findings
> 7. `crypto-report-writer` — produce report-ready output

The router does not audit anything. It produces a skill sequence and reasons
for each choice, then hands off.

---

## Step 2 — Build audit context

```text
Use crypto-audit-context on the src/ directory.
```

> **Context output (condensed):**
> Critical paths: `Verifier::verify()`, `G1Affine::from_bytes()`, `prepare_inputs()`
> Trust boundary: all proof elements are attacker-controlled; no subgroup checks visible at entry
> Threat model: missing membership check → forged proof acceptance
> Unresolved: does `from_bytes` enforce prime-order subgroup?
> Session state written to `.zkcrypto-audit/groth16-example/session.json`
> Next: run `spec-delta-checker` + `ecc-pairing-auditor` in parallel

The context skill maps what the code *enforces*, not what the docs claim.
The session file persists the handoff so the audit can resume across
conversations.

---

## Step 3 — Spec delta and domain review

```text
Use spec-delta-checker. The code targets the Groth16 paper (BCTV14).
```

> **Spec-delta output (condensed):**
> Deviation: paper requires subgroup membership check on proof elements A, B, C.
> Implementation: `from_bytes` returns `Option`, no explicit membership enforcement.
> Classification: security-relevant omission — suspected finding.

```text
Use ecc-pairing-auditor on the verifier and deserialisation modules.
```

> **ECC-pairing output (condensed):**
> `G1Affine::from_bytes` decodes the point but does not call `is_torsion_free()`.
> Pairing inputs are used immediately after decode with no membership gate.
> Suspected finding: missing subgroup check on verifier inputs.

Each domain skill preserves its output contract rather than merging findings
into prose — this keeps verification clean in the next step.

---

## Step 4 — Verify findings

```text
Use crypto-fp-check on the suspected subgroup check finding.
```

> **FP-check output (condensed):**
> Verdict: TRUE POSITIVE
> Trigger path: attacker supplies malformed A ∈ G1 not in prime-order subgroup → `from_bytes` succeeds → pairing computed on tainted point
> Impact: forged proof may satisfy the verifier equation
> Severity: High — PoC: construct a point of small order, show `verify()` returns `Ok(())` on an invalid proof
> Next: `crypto-report-writer`

`crypto-fp-check` enforces the PoC gate — Critical/High findings require
executable proof before they advance to the report.

---

## Step 5 — Write the report

```text
Use crypto-report-writer for the verified subgroup check finding.
```

> **Report output (condensed):**
>
> **[H-01] Missing subgroup membership check on Groth16 proof elements**
> Severity: High
> Location: `src/verifier.rs` — `G1Affine::from_bytes`, `Verifier::verify`
> Impact: A point outside the prime-order subgroup passes deserialisation and
> reaches the pairing computation, allowing an adversary to forge a proof that
> satisfies the verifier equation without a valid witness.
> Recommendation: call `is_torsion_free()` immediately after `from_bytes` and
> return an error before any pairing operation if the check fails.

---

## Resuming the audit later

The session state at `.zkcrypto-audit/groth16-example/session.json` records
every handoff. To continue in a new conversation:

```text
Use crypto-audit-router. Resume session at .zkcrypto-audit/groth16-example/session.json.
```

---
