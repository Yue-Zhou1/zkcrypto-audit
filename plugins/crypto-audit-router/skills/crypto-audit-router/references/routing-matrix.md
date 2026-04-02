# Routing Matrix

Use this matrix to choose the right skill after `crypto-audit-context`.

| Situation | Route |
|---|---|
| The code claims to follow an RFC, paper, or reference implementation | `spec-delta-checker` |
| The issue touches points, pairings, BLS verification, DST, or aggregation | `ecc-pairing-auditor` |
| The issue touches witness constraints, transcripts, verifier equations, KZG, or recursion | `zk-circuit-auditor` |
| The issue touches gnark frontend/backend mismatch, Go witness assignment, public witness exposure, or gnark constraint APIs | `gnark-auditor` |
| The issue touches Cairo hints, felt252 arithmetic, builtins, or Sierra/CASM compilation | `cairo-auditor` |
| The issue touches Noir unconstrained functions, oracles, Brillig/ACIR, or Noir witness generation | `noir-auditor` |
| The issue touches zkVM guest programs, precompiles, memory consistency, or continuation proofs (SP1, RISC Zero, Valida) | `zkvm-auditor` |
| The issue touches Poseidon, Rescue, MiMC, Pedersen, or other ZK-friendly hash parameters, sponge construction, or domain separation | `hash-function-auditor` |
| The issue touches KZG, FRI, IPA, Pedersen commitments, polynomial degree bounds, or evaluation proofs | `commitment-scheme-auditor` |
| The issue touches Merkle trees, inclusion proofs, sparse trees, or Merkle root computation | `merkle-tree-auditor` |
| The issue touches Fiat-Shamir transcripts, challenge derivation, transcript completeness, or interactive-to-non-interactive transforms | `fiat-shamir-auditor` |
| The issue touches FROST, MuSig2, DKG, VSS shares, nonce binding, or interpolation | `dkg-threshold-auditor` |
| The issue touches constant-time behavior, zeroization, `unsafe`, feature flags, or dependency hygiene | `rust-crypto-safety` |
| The issue has survived domain review and needs truth/impact validation | `crypto-fp-check` |
| The issue is verified and needs report prose | `crypto-report-writer` |
| The issue is verified and may need prior-art lookup or index storage | `zkbugs-index` |

Multiple routes can apply. Prefer running `spec-delta-checker` alongside the
relevant domain auditor when the code is adapting a standard construction.
