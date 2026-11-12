# Fuzz Pre-Generation Checklist

## Environment

- [ ] `cargo fuzz --version` succeeds (`cargo-fuzz` installed)
- [ ] Target crate compiles in fuzz mode
- [ ] Nightly Rust toolchain and a C++ compiler are available (`libfuzzer-sys` builds its bundled `libFuzzer`; x86-64 or AArch64 Unix-like hosts only)

## Target setup

- [ ] At least one `fuzz_target!` entry point per high-risk API surface
- [ ] Initial corpus seed provided when known-good fixtures exist
- [ ] Input adapters avoid panicking on malformed bytes before SUT call

## Sanitizers and bounds

- [ ] Address sanitizer (the `cargo fuzz` default) kept on; memory sanitizer run separately with `--sanitizer memory` where supported
- [ ] Timeout budget set via `FUZZ_TIME_LIMIT` (default: 600 seconds per target)
- [ ] Iteration cap configured via `FUZZ_MAX_ITERS` (`-runs=<N>`) for bounded CI runs; fix the libFuzzer seed with `-seed=<N>` when a repeatable run is needed
- [ ] Optional `PROPTEST_CASES` set when using lightweight `proptest` fallback

## Artifact handling

- [ ] Crash artifacts are preserved for PoC and replay
- [ ] Reproduction command recorded with exact target and input path
- [ ] Triage notes classify DoS panic vs logic/soundness impact
