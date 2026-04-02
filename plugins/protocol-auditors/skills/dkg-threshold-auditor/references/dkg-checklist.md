# DKG Checklist

Use this checklist when reviewing DKG and threshold-signature logic.

- **Rogue key attack** — MuSig2 / FROST style aggregation requires a key aggregation commitment or equivalent defense
- **FROST nonce binding** — nonces must bind the message, aggregate public key, and fresh randomness
- **VSS share verification** — each participant must verify received shares against the public polynomial commitments
- **Share verification equation** — `f(i)·G == Σ a_j·i^j·G` must be checked over the correct group and field
- **Threshold reconstruction correctness** — exactly `t` shares reconstruct and `t-1` shares reveal nothing
- **Protocol abort information leakage** — partial rounds and abort paths must not leak secrets or shares
- **Participant identity binding** — a share from participant `i` must not be accepted as participant `j`
- **Concurrent session isolation** — multiple DKG or signing sessions must keep independent state
- **Lagrange interpolation denominator check** — duplicate identifiers make the denominator zero and must be rejected
- **Identifier space validation** — participant indices must be non-zero, distinct, and within the field
