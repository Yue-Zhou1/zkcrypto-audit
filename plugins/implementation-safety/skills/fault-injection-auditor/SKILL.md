---
name: fault-injection-auditor
description: >
  Audit cryptographic code for active fault-injection attacks: RSA-CRT
  Bellcore faults, ECDSA/EdDSA differential fault analysis, verification-skip
  glitches, redundant-computation bypass, and verify-after-sign gaps. Use when
  the threat model includes an attacker who can glitch computation, distinct
  from passive side-channel leakage.
allowed-tools: Read Grep Glob Bash
---

# fault-injection-auditor

Domain auditor for ACTIVE fault attacks — an adversary who can corrupt a
computation (voltage/clock glitch, laser, rowhammer) and observe the faulty
output. This is a separate discipline from passive side channels: the
attacker changes the computation rather than only measuring it.

Dedicated skill by design: fault resistance is not folded into
`side-channel-auditor`'s timing/cache/power scope.

## When to Use

- The threat model includes physical or software-induced fault injection
- Auditing RSA-CRT signing for Bellcore faults
- Auditing deterministic ECDSA/EdDSA signers for differential fault
  analysis
- Reviewing verification-skip glitches, redundant-computation bypass, and
  verify-after-sign presence
- Assessing fault-detection countermeasures and their coverage

## When NOT to Use

- Passive timing/cache/power leakage (attacker only measures) ->
  `side-channel-auditor`
- Signature verification-equation or encoding correctness ->
  `signature-scheme-auditor`
- Randomness/nonce lifecycle -> `randomness-auditor`
- Pure protocol-correctness review with no physical/fault attacker

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "Fault injection needs physical access, so it is out of scope" | Decide from the threat model, not by default. Rowhammer and software-controlled voltage or frequency interfaces inject faults without physical access, and HSMs, wallets, TEEs, and embedded signers put the attacker next to the device |
| "The signature scheme is deterministic, so it is the safer choice" | Determinism removes the RNG risk and adds a fault risk: one correct and one faulted signature over the same message recover the key in EdDSA and deterministic ECDSA |
| "We verify the signature after signing" | Only if the same glitch cannot skip the check, the check covers the bytes actually released, and a failure suppresses the output |
| "The computation runs twice and the results are compared" | A fault repeated in both runs, or a single skipped comparison branch, defeats naive redundancy |
| "RSA-CRT is internal to the library" | One faulted half-exponentiation leaks a factor of the modulus through a gcd unless the result is verified before release |

## Core Review Areas

1. Fault model: what the assumed attacker can do (single/multiple faults,
   instruction skip, data corruption, targeting precision) — findings are
   only meaningful relative to a stated model
2. RSA-CRT: verify-after-sign OR redundant recombination; a single fault
   in one CRT half factors N (Bellcore attack)
3. Deterministic signatures: DFA on ECDSA/EdDSA — a correct+faulted pair
   over the same message recovers the key; countermeasure is redundancy or
   re-verification
4. Verification skip: can a glitch bypass the branch that enforces a
   signature/MAC/proof check (skip the `if (!valid) reject`)?
5. Redundant computation and consistency checks: presence, coverage, and
   whether the check itself is fault-attackable (double-fault)
6. Verify-after-sign: signer re-verifies its own output before release
7. Evidence limits: fault findings are usually theoretical without lab
   hardware — disposition honesty (`observation`/`residual_risk`) matters

## Workflow

### Phase 1: Fault-model and surface mapping

- Read `references/fault-injection-checklist.md`
- Record the assumed attacker model and enumerate fault-sensitive
  operations (CRT, deterministic signing, verification branches)

### Phase 2: Fault-path review

- Execute `workflows/fault-path-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize missing verify-after-sign, unprotected CRT, and single-branch
  verification

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check` with explicit evidence
  limitations
- Cross-route passive leakage to `side-channel-auditor` and signature
  semantics to `signature-scheme-auditor`

## Output Contract

Produce a fault-injection handoff that includes:

- `fault_model`
- `injection_point`
- `redundancy_or_detection_invariant`
- `evidence_limitations`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/fault-injection-checklist.md](references/fault-injection-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/fault-path-review.md](workflows/fault-path-review.md)
