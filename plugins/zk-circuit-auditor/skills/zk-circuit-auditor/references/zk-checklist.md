# ZK Checklist

Use this checklist when reviewing circuit logic, proof generation, and verifier
code.

- **Under-constrained signals** — every intermediate witness signal must be fully constrained
- **Fiat-Shamir transcript completeness** — the challenge must be derived from a hash of ALL prior prover messages
- **Verifier equation correctness** — the pairing check or polynomial identity must exactly match the scheme specification
- **Public input encoding consistency** — circuit and verifier must encode public inputs identically
- **Non-native field arithmetic bit-width** — limb decomposition and range checks must be complete
- **KZG trusted setup provenance** — the SRS must come from a verifiable ceremony and match the circuit context
- **Lookup table multiplicity overflow** — multiplicity counters must be range-checked across the full field
- **Zero-knowledge property** — witness polynomials and analogous secret data must be properly blinded
- **KZG opening point soundness** — the verifier must control the evaluation point
- **Batch verification random challenge** — the batching challenge must commit to all proofs in the batch
- **Recursion public input threading** — the inner verifier key digest and related binding data must be threaded correctly
