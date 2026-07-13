# fault-path-review.md

Executable review workflow for active fault-injection resistance.

1. **State the fault model.** Before anything else, write down the assumed
   attacker (single/multiple faults, skip vs corruption, precision, access)
   and confirm the deployment exposes it. If it does not, cap findings at
   `observation` and say so.

2. **Enumerate fault-sensitive operations.**
   `grep -rn "crt\|dmp1\|dmq1\|iqmp\|verify\|sign\|deterministic\|nonce\|ladder\|montgomery"`
   to locate RSA-CRT recombination, signing routines, deterministic-nonce
   paths, verification branches, and exponentiation ladders.

3. **Audit RSA-CRT.** Confirm verify-after-sign or fault-hardened
   redundancy on the recombination, and that the check is not a single
   skippable branch or same-path recompute (F1, F5).

4. **Audit deterministic signatures.** Flag deterministic ECDSA/EdDSA/
   ML-DSA/SLH-DSA signing without redundancy/re-verification as DFA-exposed
   (F2); recommend hedging or verify-after-sign. Route scheme specifics to
   `pqc-signature-auditor` / `signature-scheme-auditor`.

5. **Audit verification gates.** For every signature/MAC/proof/secure-boot
   check, determine whether an instruction-skip or single bit-flip flips
   accept/reject (F3, F4). Prefer positive-condition accept paths.

6. **Audit countermeasures and loops.** Check redundancy independence,
   comparison hardening, and loop-counter protection (F5, F6); confirm
   fault handlers fail safe and are not oracles (F7).

7. **Build simulation evidence where possible.** For a candidate bypass,
   write a fault-simulation harness (skip an instruction / flip a bit in a
   test double) to demonstrate the accept-on-fault or key-leak. This is
   the acceptable executable evidence when physical injection is out of
   scope; note the assumption.

8. **Produce the output contract.** For each candidate fill `fault_model`,
   `injection_point`, `redundancy_or_detection_invariant`,
   `evidence_limitations` (source-only vs simulated vs lab), `disposition`
   (honest — usually `residual_risk`/`observation` without hardware), and
   `next_route` (`crypto-fp-check`; `side-channel-auditor` for passive
   leakage; the signature auditors for scheme semantics).
