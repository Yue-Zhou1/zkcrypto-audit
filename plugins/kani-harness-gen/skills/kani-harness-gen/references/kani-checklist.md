# Kani Pre-Generation Checklist

## Environment

- [ ] `cargo kani --version` succeeds (cargo-kani installed)
- [ ] Target project compiles with `cargo build`
- [ ] No build errors that would prevent Kani analysis

## Harness design

- [ ] Each harness tests exactly one property
- [ ] Every generated harness is annotated with `#[kani::proof]`
- [ ] `kani::any()` used for inputs, with `kani::assume()` for valid preconditions
- [ ] `#[kani::unwind(N)]` set to cover the loop depth of the target function
- [ ] Harness does not depend on external state (files, network, randomness)

## Bounds

- [ ] Field elements bounded to valid range via `kani::assume(x < MODULUS)`
- [ ] Array sizes bounded to prevent unbounded unrolling
- [ ] Recursion depth bounded by unwind annotation
- [ ] Timeout set (default: 5 minutes per harness)

## Interpretation

- [ ] PASS means "property holds for all inputs within the bounds" — not universally
- [ ] FAIL counterexample is a concrete input — usable as PoC
- [ ] UNREACHABLE means the assume() preconditions excluded all inputs — check constraints
