# Kani Pre-Generation Checklist

## Environment

- [ ] `cargo kani --version` succeeds (cargo-kani installed)
- [ ] Target project compiles with `cargo build`
- [ ] No build errors that would prevent Kani analysis

## Harness design

- [ ] Each harness tests exactly one property
- [ ] Every generated harness is annotated with `#[kani::proof]`
- [ ] `kani::any()` used for inputs, with `kani::assume()` for valid preconditions
- [ ] `#[kani::unwind(N)]` set to at least one more than the maximum loop iteration count of the target function; a bound that is too low fails with an unwinding assertion instead of passing
- [ ] Harness does not depend on external state (files, network, randomness)

## Bounds

- [ ] Field elements bounded to valid range via `kani::assume(x < MODULUS)`
- [ ] Array sizes bounded to prevent unbounded unrolling
- [ ] Recursion depth bounded by unwind annotation
- [ ] Timeout set via `KANI_TIMEOUT_SECONDS` (default: 300 seconds per harness) and enforced with `timeout` or `--harness-timeout`; Kani itself does not read the variable
- [ ] Optional `PROPTEST_CASES` configured when using `proptest` fallback checks

## Interpretation

- [ ] PASS means "property holds for all inputs within the bounds" — not universally
- [ ] FAIL counterexample is a concrete input — usable as PoC
- [ ] UNREACHABLE means no execution reaches the check, often because the assume() preconditions excluded all inputs — check constraints
- [ ] Constant-time concerns are routed to `side-channel-auditor`, not treated as Kani-proof obligations
