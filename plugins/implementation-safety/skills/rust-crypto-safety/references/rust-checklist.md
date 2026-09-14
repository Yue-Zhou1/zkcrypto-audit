# Rust Crypto Checklist

Use this checklist for implementation-level review of cryptographic Rust crates.

- **Constant-time throughout** — all operations on secret data use `subtle` primitives or equivalent constant-time constructions; no secret-dependent `if`, `match`, array indexing, or early return
- **Zeroize all secret material** — private keys, nonces, intermediate scalars, and session state implement `ZeroizeOnDrop` or an equivalent reviewed strategy
- **`unwrap()` and `expect()` on cryptographic paths** — panics on verifier or parser paths can become availability bugs or safety holes depending on caller behavior
- **Integer overflow in field arithmetic** — use chosen checked or explicit wrapping semantics rather than relying on debug-mode overflow behavior
- **Guest build profile** — for a binary that runs inside a zkVM, read the guest workspace's release profile (`overflow-checks`, `debug-assertions`, `panic`); wrapping arithmetic in the proven binary is silent unless every value path uses checked ops
- **Guest panics are proof failures** — classify every `unwrap`, `expect`, `assert`, and slice index on a guest path as intended fail-closed (documented, tested) or as an undiagnosable failure that should be an error
- **All `unsafe` blocks audited individually** — review every `transmute`, `from_raw_parts`, and `_unchecked` call for its exact soundness invariant
- **`as` numeric casts** — silent truncation or sign changes can corrupt field values and length calculations
- **`Clone` on secret-containing types** — copied secrets may extend lifetime and bypass zeroization expectations
- **Manual `Send`/`Sync` impls** — hand-written concurrency traits on cryptographic state must be justified against aliasing and mutation rules
- **Feature flag hidden paths** — `cfg(feature = "unsafe_internals")`, `cfg(test)`, and debug-only branches can change security semantics
- **Dependency version pinning** — `Cargo.lock`, non-wildcard versions, and reviewed `git` dependencies are part of the security surface
- **Error type information leakage** — detailed crypto error states can create oracle surfaces on validation paths
