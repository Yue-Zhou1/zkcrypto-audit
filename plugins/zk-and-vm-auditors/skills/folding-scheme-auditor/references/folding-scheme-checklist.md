# Folding Scheme Checklist

Use this checklist when reviewing Nova, HyperNova, ProtoStar, or other
folding-scheme-based proof systems in Rust.

- **Relaxed R1CS equation** — folding must satisfy `AZ ∘ BZ = u·CZ + E`; verify error term E is correctly updated at each fold and not truncated
- **Cross-term commitment** — the cross-term T must be committed and included in the Fiat-Shamir challenge before the challenge is derived; a missing or post-hoc T breaks binding
- **Accumulator consistency** — the running instance (u, x, W, E) must correctly aggregate both instances via scalar multiplication and linear combination; check each field
- **IVC step public input threading** — the hash of the running instance must be passed as a public input to the step circuit and verified inside the circuit; a break allows an adversary to substitute any intermediate state
- **Base case soundness** — the initial (trivial) instance must satisfy the relaxed R1CS relation; if the base case is not explicitly checked, an adversary may start from an invalid state
- **Cycle-of-curves field compatibility** — in a two-curve cycle (e.g., Pasta: Pallas/Vesta), the scalar field of one curve is the base field of the other; encoding across curves must respect this
- **Cross-curve public input range** — public inputs passed from one curve to the other must be range-checked to fit in the receiving curve's scalar field
- **Error term accumulation bounds** — E must remain bounded across folds; unbounded growth can cause the final SNARK to accept an invalid computation
- **Final SNARK key binding** — the SNARK over the last accumulator must use the correct verifier key; a mismatched key accepts any accumulator value
- **HyperNova multi-folding** — the multi-folding relation must correctly handle all k instances; verify the sumcheck protocol and the LCCCS/CCCS relation per instance
