# Toolchain

Use these tools in combination. No single tool covers the whole Rust crypto
surface.

## Static analysis

- `cargo audit` — checks dependencies against RustSec advisories
- `cargo clippy -- -D warnings` — focus on `clippy::arithmetic_side_effects` (formerly `clippy::integer_arithmetic`), `clippy::as_conversions`, and `clippy::unwrap_used`; these are restriction lints, allowed by default, so enable each with `-W`
- `cargo geiger` — counts `unsafe` usage per crate
- `cargo deny check` — checks advisories, licenses, banned or duplicate crates, and crate sources
- `rudra` — detects unsafe memory-safety issues and unsound `Send`/`Sync`; archived and pinned to `nightly-2021-10-21`, so it only analyses crates that build on that toolchain
- `mirai` — abstract interpretation for overflow and reachable panic surfaces

## Dynamic analysis and fuzzing

- `cargo-fuzz` — fuzz deserialization, decompression, and verification entrypoints
- `honggfuzz-rs` — alternative coverage-guided fuzzing for awkward input shapes
- `proptest` / `bolero` — property-based tests for algebraic laws and invariants
- Differential fuzzing — compare identical inputs across two implementations
- `cargo-valgrind` / Miri — detect uninitialized reads and leaks on unsafe paths

## Side-channel detection

- `dudect` — statistical timing analysis for constant-time claims
- `ctgrind` / Valgrind memcheck — detect control-flow or memory access dependence on secrets
- LLVM IR inspection with `--emit=llvm-ir` — inspect secret-dependent `br` and address calculations
- `subtle` crate audit — confirm `ct_eq()` and `ConditionallySelectable` are used where required

## Supply chain and dependencies

- `cargo tree` — inspect direct and transitive crypto dependency versions
- Check whether `Cargo.lock` is committed for reproducibility
- Identify `git = "..."` dependencies and review the referenced forks directly
- Inspect feature flags for hidden unsafe entrypoints and validation bypasses
