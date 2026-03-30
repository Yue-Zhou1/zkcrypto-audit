# Pairing Checklist

Use this checklist when reviewing pairings, BLS verification, and aggregate
signature logic.

- **Rogue key / key cancellation attack** — aggregate signatures must enforce proof of possession or message augmentation
- **Pairing equation direction** — the implemented equation must match the protocol specification exactly
- **G1/G2 assignment consistency** — public keys and signatures must stay in the intended groups throughout the protocol
- **Final exponentiation** — raw Miller-loop outputs are not valid GT elements until final exponentiation is applied
- **BLS domain separation (DST)** — `hash_to_curve` DST values must be unique per protocol, suite, and version
- **Batch verification randomness** — random scalars for batch verification must be unpredictable and uninfluenceable by the prover
- **Multi-Miller loop batching** — multi-signature verification should use a reviewed multi-Miller path and preserve correctness
- **Signature aggregation order independence** — aggregation must be commutative across signer orderings
