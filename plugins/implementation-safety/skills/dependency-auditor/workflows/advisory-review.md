# advisory-review.md

Executable review workflow for dependency advisories, feature semantics,
and fork provenance. Commands are for Cargo; step 8 covers Go and npm.

1. **List the shipped artifacts** from CI, Dockerfiles, and build scripts:
   each host binary, zkVM guest, or wasm module with its manifest,
   lockfile, target, profile, and release feature flags. One pass each.

2. **Resolve the graph without changing it.**

   ```sh
   cargo metadata --locked --format-version 1 >/dev/null  # stale lock fails
   cargo tree --locked --target <triple> -e normal,build <feature flags>
   cargo tree --locked -d                                 # duplicates
   ```

   Isolate the crypto set (primitives, field and bignum arithmetic, RNG,
   proof systems, zkVM SDK) with active versions and each crate's source.

3. **Run advisory tooling and record the run:** `cargo audit`,
   `cargo deny check advisories bans sources`, and `cargo vet` if the
   repository keeps a `supply-chain` directory. For each hit, find who
   pulls it (`cargo tree --locked -i <crate>`) and whether the affected
   function is reachable under the resolved features. Read upstream
   changelogs for the crypto set too; not every security fix becomes an
   advisory. Document the compensating control for any exposure that
   cannot be removed.

4. **Review non-registry sources by hand.** For each git, path, or
   vendored dependency: confirm a `rev` pin, identify the upstream base
   (`git merge-base`), read the diff from base to pin, and list upstream
   security fixes after the base that the fork lacks (P3, P6, P9).

5. **Read resolved features** for each crypto crate
   (`cargo tree --locked --target <triple> -e features -i <crate>`) and
   compare with its `[features]` table and `cfg` usage. Classify each
   enabled feature and backend selector (features, `--cfg` flags,
   build-script detection) as security-significant or not, and check the
   duplicates from step 2 for incompatible assumptions (P2, P4, P8).

6. **Check the patch table.** Confirm every `[patch]` and `[replace]`
   entry appears in the graph of the target it is meant for, using the
   guest lockfile for guest code (P7). Flag unused entries.

7. **List build-time code** in the crypto set: build scripts, procedural
   macros, bundled native sources, and what each reads and generates
   (P11). Check whether the toolchain pin blocks an upgrade (P5).

8. **Go and npm, if present.** Go: `go list -m all`, `govulncheck ./...`,
   `replace` directives, build tags. npm: exact lockfile install in CI,
   `npm audit`, URL dependencies, `overrides`, install scripts.

9. **Fill the output contract** per candidate, with `next_route` set to
   `crypto-fp-check` plus any cross-route.

## Failure rules

- Never run a command that rewrites a lockfile in the audited tree.
- Graph queries do not run build scripts; a build does. Do not build
  untrusted dependencies outside a sandbox. Graph queries still invoke
  `rustc`, which a `.cargo/config.toml` in the tree can redirect
  (`build.rustc`, `build.rustc-wrapper`); read that file first.
- A missing, offline, or failing tool yields `unverified`, never "clean".
- No conclusion about features, backends, or patches from a manifest
  alone; cite resolved-graph output.
- "Not reachable" needs a call-path trace, else it is `unverified`.
