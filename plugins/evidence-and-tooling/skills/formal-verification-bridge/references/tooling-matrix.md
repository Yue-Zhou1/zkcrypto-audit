# Formal Verification Tooling Matrix

| Tool | Primary target | Prerequisites | Input format | Output shape | Limitations |
|---|---|---|---|---|---|
| Ecne | Checks that R1CS constraints uniquely determine outputs given inputs (under-constrained detection) | Julia 1.7+ and `just`; checkout of `franklynwang/EcneProject` (no commits since 2022) pinned by commit | De-optimized R1CS file (`circom --r1cs --O0`) + `.sym` symbol file; optional trusted R1CS files | `true` when uniqueness is proved; otherwise a "potentially unsound constraints" message | R1CS only; a negative result means Ecne could not prove uniqueness, not that the circuit is unsound; does not check functional correctness |
| Picus | Checks the uniqueness property (under-constrained signals) of ZKP circuits; implementation of QED² (Veridise) | Racket 8.0+, cvc5 with finite-field support (recommended) or Z3, `circom` for Circom sources; or the project Docker image | `.circom` (Circom >= 2.0.6), `.r1cs`, or gnark `.sr1cs` file | `safe` / `unsafe` (with counterexample) / `unknown` | Uniqueness only, not functional correctness; `unknown` on solver timeout; large circuits may need manual splitting |
| Circomspect | Circom static analysis and linting (Trail of Bits); not a formal verifier | Rust toolchain (`cargo install circomspect`) + Circom project sources | Path to a `.circom` file or directory | Informational/warning/error diagnostics; optional SARIF file (`--sarif-file`) | Analysis passes flag potential issues and prove nothing; DSL-specific; not suitable for non-Circom targets |

## Usage notes

- Tool runs are optional and engagement-dependent.
- Always pin tool version and record invocation command.
- Fail closed when prerequisite checks fail.
