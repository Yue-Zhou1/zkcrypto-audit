---
name: dependency-auditor
description: >
  Audit the dependency and supply-chain surface of cryptographic code:
  advisory coverage, vulnerable or yanked versions, security-significant
  feature flags and their unification across the build graph, backend
  selection, patch/replace/git/path dependencies, fork provenance and
  drift, vendored code, lockfile enforcement, build scripts, and duplicate
  crypto crates. Rust first, with Go modules and npm. Use when reviewing
  manifests, lockfiles, forks, or which crypto backend a build
  ships.
allowed-tools: Read Grep Glob Bash
---

# dependency-auditor

Single owner of dependency and supply-chain review for crypto code: what
third-party code is in each shipped artifact, in which version and
configuration, where it came from, and what is known against it.

**Core principle:** audit the resolved graph of the artifact that ships,
for its target and features. Manifests state intent; the resolver decides.

## When to Use

- Auditing lockfiles and dependency graphs for vulnerable crypto crates
- Reviewing security-significant feature flags, default features, and the
  backend (assembly, portable, `std`, `no_std`) a build selects
- Checking transitive dependency duplication and semantic drift
- Validating fork provenance and patch divergence from upstream
- Reviewing `[patch]`, `[replace]`, git, path, and vendored dependencies,
  including zkVM guest builds where a patch decides which code path runs
- Reviewing build scripts and procedural macros in the crypto set

## When NOT to Use

- Whether a selected backend is constant-time -> `side-channel-auditor`
- First-party Rust safety: `unsafe`, panics, zeroization, unchecked
  constructors -> `rust-crypto-safety`
- Quality of an entropy backend the graph selects -> `randomness-auditor`
- Whether a patched crate's precompile is sound -> `zkvm-auditor`
- Algorithmic correctness of a dependency -> the primitive's domain
  auditor, chosen by `crypto-audit-router`
- Checking that an upgrade fixes a verified finding -> `fix-verification`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The advisory scan is clean" | Advisory databases list reported issues against registry package names and version ranges. A git fork, a vendored copy, or C code bundled in a `-sys` crate carries a version string that says nothing about which fixes it contains |
| "The lockfile pins it" | Only for builds that enforce it. A build without `--locked` may re-resolve, `cargo install` ignores the lockfile unless told otherwise, and a library's lockfile does not bind its consumers |
| "We set `default-features = false`" | Features unify across the graph. If any other crate enables the feature on the same package version, every user gets it; resolver 2 and later exempt only build-dependency, proc-macro, dev-dependency, and inactive-target edges. Read the resolved feature set |
| "The fork only adds an optimisation" | A fork freezes its base. Every upstream fix after the base is missing until merged, and the added code is unaudited crypto on the hot path |
| "The vulnerable function is not called" | That is a reachability claim and needs a call-path trace under the resolved features, including calls made by other dependencies. Without it the entry stays open |
| "The patch is declared in the manifest, so the patched crate runs" | A patch takes effect only where the graph for that target requests a version it matches. An unmatched patch is ignored with a warning and the original crate runs |

## Core Review Areas

1. Dependency lockfile completeness, enforcement, and version provenance
2. Advisory coverage for direct and transitive crypto dependencies
3. Security-significant feature-flag behavior: unification, default
   features, backend and `std`/`no_std` selection
4. Fork provenance, patch drift, and vendored dependency auditability
5. `[patch]`, `[replace]`, git, and path dependencies: pinning, resolution
6. Toolchain/MSRV drift and duplicate crypto stack semantics
7. Build scripts, procedural macros, and bundled native code
8. Go module and npm equivalents where the project uses them

## Workflow

### Phase 1: Graph and inventory

- Read `references/dependency-checklist.md`
- Enumerate direct and transitive crypto dependencies and active feature
  sets for each shipped artifact

### Phase 2: Advisory, feature, and provenance review

- Execute `workflows/advisory-review.md`: advisories and changelogs
  against the graph, semantics of enabled and disabled feature
  combinations, duplicate crates with incompatible behavior, fork drift

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize vulnerable transitive pins, feature regressions, stale fork
  drift, mutable pins, and unresolved patches

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route variable-time backends to `side-channel-auditor`, entropy
  backends to `randomness-auditor`, unresolved guest patches to
  `zkvm-auditor`, first-party code issues to `rust-crypto-safety`

## Output Contract

Produce a dependency handoff listing each candidate with:

- `dependency_path` (direct, transitive, fork, or vendored; with version)
- `affected_artifact` (binary or guest, target, profile, feature set)
- `issue_class` (`versioning`, `feature_semantics`, `duplicate_stack`,
  `fork_drift`, `pinning`, or `build_time_code`)
- `invariant_at_risk` (the advisory, feature, or provenance property)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/dependency-checklist.md](references/dependency-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/advisory-review.md](workflows/advisory-review.md)
