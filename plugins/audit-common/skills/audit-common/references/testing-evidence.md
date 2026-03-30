# Testing Evidence

These are the minimum categories of testing evidence to look for when deciding
whether an implementation is well exercised.

| Evidence type | What to look for | Why it matters |
|---|---|---|
| Known-answer tests | RFC/standard vectors with byte-exact expected output | Proves the implementation matches canonical examples |
| Boundary tests | Min/max values, zero, identity, field edges, malformed lengths | Finds off-by-one and range failures |
| Negative tests | Invalid proofs, malformed points, bad signatures, corrupted ciphertexts | Proves rejection paths actually reject |
| Algebraic property tests | Associativity, inverses, subgroup laws, homomorphism | Catches subtle arithmetic or protocol invariant bugs |
| Differential testing | Output compared against a trusted reference implementation | Finds semantic drift and optimized-backend divergence |
| Fuzzing | Structured random input exploration and crash/property fuzzing | Finds parser, state-machine, and edge-case bugs |
| Coverage evidence | Evidence that critical paths and validation branches are exercised | Prevents false confidence from shallow tests |
| Wycheproof and equivalent suites | Curated adversarial vectors for relevant primitives | Covers tricky edge cases that standards examples omit |

## Review Rule

When a finding depends on "the tests did not catch this", name which of the
categories above are missing or weak. "Tests are insufficient" is too vague.
