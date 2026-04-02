# Fiat-Shamir Finding Patterns

- **Frozen heart** — challenge independent of prover commitments due to missing absorb.
- **Challenge derived before all commitments absorbed** — prover can adapt commitments after observing challenge.
- **Missing public input in transcript** — verifier/prover may derive challenges for different statements.
- **Domain separation label reused across protocol rounds** — context collision enables cross-round replay/confusion.
- **Transcript reset between rounds losing prior binding** — later challenges ignore earlier commitments.
- **Weak hash used for challenge derivation** — non-collision-resistant hash undermines transform assumptions.
