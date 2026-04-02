# Dependency Finding Patterns

Common vulnerability patterns in cryptographic dependency sets.

- **vulnerable version pinned transitively** — indirect dependency path forces known-vulnerable release.
- **feature flag disables subgroup checks** — build-time option removes critical validation logic.
- **internal fork diverges from security patch** — private fork misses upstream fix while appearing up-to-date.
- **duplicate crypto crates with incompatible semantics** — parallel dependency versions disagree on core invariants.
- **toolchain constraint blocks secure upgrade path** — MSRV/CI pinning prevents adopting patched versions.
