# Dependency Audit Checklist

## Inventory and lock state

- [ ] Dependency lockfile is present, current, and committed
- [ ] Direct and transitive crypto dependencies are fully enumerated
- [ ] Build profile and target-specific dependency variants are captured

## Advisory coverage

- [ ] Known advisories are reviewed for all crypto-relevant dependencies
- [ ] Advisory status is checked for direct and transitive paths
- [ ] Mitigations/patches are documented when vulnerable versions are required

## Feature-flag semantics

- [ ] Security-significant feature-flag toggles are identified and reviewed
- [ ] Feature combinations do not disable subgroup checks or validation steps
- [ ] Release/profile defaults are verified against audited assumptions

## Transitive and duplicate risk

- [ ] Duplicate crypto crates/libs with divergent semantics are identified
- [ ] Transitive vulnerable versions are not pinned through indirect paths
- [ ] MSRV/toolchain constraints do not force insecure dependency versions

## Fork provenance and vendoring

- [ ] Internal/vendor forks track upstream security patches
- [ ] Fork divergence and rationale are documented
- [ ] Vendored patches are auditable and reproducible
