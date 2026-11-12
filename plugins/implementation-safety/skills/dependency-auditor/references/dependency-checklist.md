# dependency-auditor Checklist

## Inventory and lock state

- [ ] The dependency lockfile is present, current, and committed, and the
      release build enforces it (`--locked` or equivalent).
- [ ] Direct and transitive crypto dependencies are fully enumerated from
      the resolved graph, each with its source (registry, git, path,
      vendored).
- [ ] Build profile and target-specific dependency variants are captured:
      one graph per shipped artifact, with target, profile, and features.

## Advisory coverage

- [ ] Known advisories are reviewed for all crypto-relevant dependencies,
      with the tool, database, and date of the run recorded.
- [ ] Advisory status is checked for direct and transitive paths.
- [ ] Mitigations or patches are documented when vulnerable versions are
      required, and every advisory ignore entry has a valid justification.
- [ ] Yanked and unmaintained releases in the crypto set are listed.
- [ ] Dependencies advisory tooling cannot match (git, path, vendored,
      native code bundled in a `-sys` crate) are checked by hand against
      upstream security history.

## Feature-flag semantics and backend selection

- [ ] Security-significant feature-flag toggles are identified and
      reviewed from each crate's manifest and `cfg` usage.
- [ ] Feature combinations do not disable subgroup checks or validation
      steps.
- [ ] Release and profile defaults are verified against audited
      assumptions.
- [ ] The resolved feature set per crypto crate is read from the graph;
      features enabled through unification are traced to the enabling
      crate.
- [ ] Backend selection is known per target: assembly or portable, `std`
      or `no_std`, chosen by feature, `cfg` flag, or build-script detection.
- [ ] Features that expose unchecked or low-level APIs, make zeroization
      optional, or register a custom entropy backend are identified.

## Transitive and duplicate risk

- [ ] Duplicate crypto crates or libraries with divergent semantics are
      identified.
- [ ] Transitive vulnerable versions are not pinned through indirect paths.
- [ ] MSRV and toolchain constraints do not force insecure dependency
      versions; the release toolchain is pinned.

## Fork provenance and vendoring

- [ ] Internal and vendor forks track upstream security patches.
- [ ] Fork divergence and rationale are documented: the upstream base
      commit is identified and the diff from it reviewed.
- [ ] Vendored patches are auditable and reproducible: a vendored copy
      matches an upstream release or its modifications are listed.
- [ ] Git dependencies and `[patch]` entries are pinned by `rev`; a `tag`
      or `branch` is mutable and can be moved by the fork owner (a tag
      that resolves to a commit hash today is still a tag).
- [ ] `[replace]` entries, path dependencies leaving the repository, and
      registry source replacement are listed and justified.

## Patch table effectiveness

- [ ] Every `[patch.crates-io]` entry appears in the resolved graph for
      the target it is meant for
      (`cargo tree --target <guest-target> -i <crate>`); an unresolved
      patch means the accelerated or hardened fork is not running.
- [ ] Unused patch entries are flagged; they widen the trusted code base
      without effect.
- [ ] The guest lockfile, not only the host lockfile, is the one
      inspected for proven-binary dependencies.

## Build-time code

- [ ] Build scripts and procedural macros in the crypto set are listed
      with what they do: network access, environment reads, code
      generation, native compilation.
- [ ] Generated tables, constants, and bindings are reproducible from
      committed inputs.

## Go modules and npm

- [ ] Go: `go.sum` is committed; `replace` directives are justified; a
      vulnerability scan was run; build tags and cgo settings that select
      crypto backends are known; any `vendor` directory matches `go.mod`.
- [ ] npm: the lockfile is committed and CI installs from it exactly; URL
      dependencies, `overrides`, and install scripts in the crypto set are
      listed; an advisory scan was run.
- [ ] Circuit and contract libraries pulled as packages or git submodules
      are pinned to a commit.
