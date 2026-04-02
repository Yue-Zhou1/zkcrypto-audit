# Finding Patterns

Actively hunt these ZK-specific failure modes.

| Pattern | Why it matters |
|---|---|
| Verifier missing context-binding field | Allows cross-session, cross-instance, or cross-domain replay |
| Transcript absorb order mismatch | Prover and verifier may derive different semantics from the same transcript state |
| Challenge derived too early | Creates the "frozen heart" class of bug where the prover can adapt a prior message after seeing the challenge |
| Default/zero values after parse failure | Invalid commitments, points, or field elements collapse into accepted defaults |
| Unverified and verified objects sharing same type | Callers can pass unchecked values through APIs that look safe |

## Transcript Failure Example

```rust
// BUG: commitment message omitted from transcript before challenge
fn bad_prove(x: Scalar, r: Scalar) -> (G1, Scalar) {
    let r_commitment = r * G;
    let c = hash(G, x * G);
    (r_commitment, r + c * x)
}

// FIX: ALL prior prover messages must be absorbed before challenge generation
fn good_prove(x: Scalar, r: Scalar) -> (G1, Scalar) {
    let r_commitment = r * G;
    let c = hash(G, x * G, r_commitment);
    (r_commitment, r + c * x)
}
```

Treat every transcript omission as a possible **frozen heart** issue until you
prove the omitted value is already bound elsewhere.
