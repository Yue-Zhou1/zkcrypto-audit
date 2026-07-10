# codeX Proof and Validation Log

Engagement: `codeX-anchor-crypto-2026-07-10`

## PoC Gate - CX-01

PoC artifact: `zk-findings/pocs/codeX-reconstruction-poisoning.rs`

Temporary in-tree test location used for execution:

- `anchor/common/bls_lagrange/src/blst.rs`
- test function: `poc_codex_cx01_reconstruction_poisoning`

Command:

```bash
env -u TARGET_CC -u TARGET_CXX -u CC_x86_64_unknown_linux_gnu -u CXX_x86_64_unknown_linux_gnu cargo test -p bls_lagrange poc_codex_cx01_reconstruction_poisoning -- --nocapture
```

Result:

```text
running 1 test
test blst::tests::poc_codex_cx01_reconstruction_poisoning ... ok

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 10 filtered out; finished in 0.01s
```

Interpretation: the test passes while the vulnerability exists. It shows:

- all-honest threshold reconstruction verifies;
- replacing one honest partial with a rogue signature causes `combine_signatures` to return `Ok`;
- the poisoned reconstruction fails final BLS verification;
- the honest subset remains sufficient if the bad share is evicted, matching the reference SSV fallback model.

The temporary in-tree test was removed after execution. `git diff -- anchor/common/bls_lagrange/src/blst.rs` returned no diff afterward.

## Dependency Gate - CX-06

`cargo audit` was not installed globally. It was installed under `/tmp/codeX-cargo-tools` for this audit. The first install attempt failed because the environment set `TARGET_CC=riscv64-unknown-elf-gcc` for an x86_64 tool build; the retry cleared cross-compiler variables and succeeded.

Command:

```bash
/tmp/codeX-cargo-tools/bin/cargo-audit audit --json
```

Result summary:

- Exit code: 1
- RustSec database: 1159 advisories, last updated `2026-07-09T08:36:22+02:00`
- Lockfile dependencies: 875
- Vulnerabilities: 1
- Vulnerability: `RUSTSEC-2026-0204`, `crossbeam-epoch 0.9.18`, patched `>=0.9.20`
- Informational warnings: unmaintained `derivative`, `paste`, `proc-macro-error2`; unsoundness advisories for `anyhow`, `lru 0.12.5`, `rand 0.8.5`, `rand 0.9.2`

## ZK Route Gate

Command:

```bash
rg -n "circom|halo2|plonk|groth|r1cs|constraint|witness|prover|verifier|proof|poseidon|rescue|miMC|fri|stark|fiat|shamir|transcript|merkle|kzg|blob|commitment|polynomial|folding|nova|vdf|lattice|kyber|dilithium|cairo|noir|gnark|zkvm" anchor Cargo.toml Cargo.lock -g "*.rs" -g "*.toml" -g "*.lock"
```

Result summary: local source hits were SSV selection proofs, Shamir/Lagrange comments, Ethereum beacon KZG proof/blob pass-through, and transitive dependencies. No native ZK circuit/prover/verifier/transcript/commitment implementation was found.

## Session Schema Gate

Final validation command is recorded in the closeout step of this run. The session artifact is strict-schema JSON at:

- `zk-findings/sessions/codeX-anchor-crypto-2026-07-10.json`

