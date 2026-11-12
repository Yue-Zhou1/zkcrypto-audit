# dependency-auditor Spec Sources

## Normative

- The Cargo Book: the chapters on features (unification and the feature
  resolver), specifying dependencies (git `rev`/`tag`/`branch`, path),
  overriding dependencies (`[patch]`, `[replace]`), source replacement,
  build scripts, and the `--locked` behavior of the lockfile. Governs how
  a manifest turns into a resolved graph.
- RustSec Advisory Database: the advisory source behind `cargo audit` and
  the advisories check of `cargo deny`. Governs what "known vulnerable"
  means for registry crates.
- `cargo-deny` and `cargo-vet` documentation: semantics of the advisories,
  bans, and sources checks, and of audit and exemption records.
- Go Modules Reference: `go.mod` directives (`replace`, `exclude`,
  `retract`), `go.sum`, the checksum database, and vendoring. The Go
  vulnerability database and `govulncheck` documentation for advisory
  coverage.
- npm documentation: `package-lock.json`, `npm ci`, `npm audit`,
  `overrides`, and lifecycle scripts.
- Each crypto dependency's own manifest and documentation: normative for
  what its features and `cfg` flags change.

## Informative

- SLSA (Supply-chain Levels for Software Artifacts) specification:
  vocabulary for build provenance and reproducibility claims.
- Thompson, "Reflections on Trusting Trust" (Communications of the ACM,
  1984): why the toolchain and build-time code are in the trusted base.
- RUSTSEC-2022-0093 (`ed25519-dalek`, signing API that accepted a
  separate public key): an API-level flaw fixed only by a major version;
  example for duplicate major versions (P4).
- RUSTSEC-2024-0344 (`curve25519-dalek`, compiler-introduced timing
  variability in scalar subtraction): a dependency advisory whose impact
  analysis belongs to `side-channel-auditor`.
- RUSTSEC-2023-0071 (`rsa`, Marvin attack): an advisory that stayed
  without a fixed release for about three years (patched in 0.10.0), the
  case the mitigation checklist item exists for.
- CVE-2024-3094 (xz-utils backdoor): release artifacts that differed from
  the repository, delivered through build-time code (P11).
- The 2018 `event-stream` npm incident: a malicious transitive dependency
  targeting a wallet application (P1, P9).
