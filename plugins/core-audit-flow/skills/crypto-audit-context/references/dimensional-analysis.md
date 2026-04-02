# Dimensional Analysis

Before detailed review, assign a dimension to every protocol value. A
dimensionally inconsistent operation is a bug even if it compiles.

| Dimension | Catches | Example mismatch |
|---|---|---|
| Algebraic domain | Field confusion | Fr scalar used in Fp arithmetic |
| Group membership | Group swaps | G1 point where G2 expected in a pairing equation |
| Trust level | Validation gaps | Unverified deserialized point used as validated |
| Semantic role | Role confusion | Nonce reused as key material |
| Protocol context | Replay or cross-contamination | Challenge from protocol A reused in protocol B |
| Sequence position | Ordering violations | Transcript squeezed before all absorbs complete |

## Process

For each value that crosses a trust boundary:

1. Fill in all six dimensions
2. Mark any unknown or inherited dimension explicitly
3. Verify every operation preserves dimensions or performs an intentional conversion

Unknown dimensions are not bookkeeping gaps; they are audit targets.
