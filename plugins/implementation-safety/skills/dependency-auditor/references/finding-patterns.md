# dependency-auditor Finding Patterns

## P1: Vulnerable version pinned transitively

- **Pattern:** an indirect dependency path forces a release with a known
  advisory while the direct dependency list looks clean.
- **Impact:** the vulnerable code ships; exposure depends on reachability.

## P2: Feature flag disables subgroup checks

- **Pattern:** a build-time option removes validation (subgroup, on-curve,
  canonical decoding) and is on in the release graph, directly or through
  unification.
- **Impact:** the missing check's attack class applies to every caller.

## P3: Internal fork diverges from security patch

- **Pattern:** a private or vendor fork misses an upstream fix while its
  version string looks current.
- **Impact:** a public bug stays exploitable, unseen by advisory tooling.

## P4: Duplicate crypto crates with incompatible semantics

- **Pattern:** two resolved versions of one crypto crate disagree on
  validation, encoding, or defaults.
- **Impact:** paths disagree on what is valid; a fix reaches one copy only.

## P5: Toolchain constraint blocks secure upgrade path

- **Pattern:** an MSRV or CI toolchain pin prevents adopting the patched
  release.
- **Impact:** a known-vulnerable version stays in place by policy.

## P6: Patch pinned by mutable tag

- **Pattern:** in-circuit or guest crypto forks referenced by `tag =` or
  `branch =`.
- **Impact:** a moved tag changes the trusted computing base on the next
  lockfile update or unlocked build.

## P7: Patch declared but not resolved

- **Pattern:** a `[patch]` entry meant to enable a precompile or hardened
  fork never enters the guest's dependency graph.
- **Impact:** the software path runs instead of the audited one.

## P8: Unification enables an unintended feature or backend

- **Pattern:** the manifest disables default features, but another crate
  in the graph enables them or a feature that swaps the backend.
- **Impact:** the artifact ships a configuration nobody reviewed.

## P9: Advisory-blind dependency

- **Pattern:** crypto code enters by git, path, vendoring, or as native
  sources in a `-sys` crate, and the only assurance is a clean scan.
- **Impact:** known upstream vulnerabilities go unreported.

## P10: Lockfile not enforced in the release build

- **Pattern:** the lockfile is missing, ignored by the build or install
  command, or regenerated in CI.
- **Impact:** released binaries may contain versions never audited.

## P11: Build-time code with unreviewed effect

- **Pattern:** a build script or procedural macro downloads, generates, or
  selects crypto code from the build machine's environment.
- **Impact:** shipped code differs from reviewed source and between hosts.

## P12: Yanked or unmaintained crypto crate retained

- **Pattern:** a withdrawn release or an unmaintained crate stays in the
  crypto set with no recorded decision.
- **Impact:** the defect behind the yank persists; fixes will not arrive.
