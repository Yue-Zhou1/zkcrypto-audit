# Threat Model Checklist

Use this checklist before vulnerability hunting so later findings are anchored
to an explicit attacker model.

- **Threat model documented** — participants, trust assumptions, and corruption model are stated explicitly
- **Replay attack prevention** — messages and signatures bind nonce, session, chain, and contract context
- **Key authentication chain** — public keys are authenticated from a real root of trust
- **Downgrade resistance** — protocol version or parameter negotiation cannot be adversarially weakened
- **CSPRNG usage** — keygen and nonce generation use a cryptographically specified RNG or DRBG

## Review Rule

If the code assumes any of the above without enforcing it, note the assumption
as part of the audit context handoff.
