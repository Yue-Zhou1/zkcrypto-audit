# Severity Framework

Use this table to keep severity language consistent across crypto audit skills.

| Severity | Typical criteria | Examples |
|---|---|---|
| Critical | Soundness or forgery break, private key recovery, proof fabrication, attacker can violate the core security property directly | Invalid proof accepted, forged signature accepted, nonce reuse leaks signing key |
| High | Practical privacy leak, practical side-channel, strong validation failure on externally supplied data | Missing subgroup check on attacker-controlled point, transcript missing binding field, secret-dependent timing on production path |
| Medium | DoS, completeness issue, interoperability risk, error leakage, misuse-prone API boundary | Valid proof rejected, non-canonical encoding accepted without direct break, misleading parse failure behavior |
| Low | Configuration or feature-flag risk, dependency hygiene, theoretical concern without practical exploit path | Debug-only validation bypass, risky optional feature, weak documentation around unsafe path |

## PoC Rule

Every Critical/High finding must include a compilable PoC test demonstrating the
vulnerable behavior. A severity claim without executable evidence is only a
hypothesis until proven otherwise.

## Notes

- Prior art can support severity, but it does not replace target-specific proof.
- If exploitability is unclear, downgrade the confidence before downgrading the severity.
