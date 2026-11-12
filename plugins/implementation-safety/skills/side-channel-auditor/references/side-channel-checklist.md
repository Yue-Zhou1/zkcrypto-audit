# side-channel-auditor Checklist

## Observer model and secret inventory

- [ ] The observer model is stated: remote timing, co-located (shared
      cache or core), or physical (power, EM).
- [ ] Every secret-bearing value is listed, intermediates included: keys,
      nonces, witness values, shared secrets, unauthenticated plaintext,
      and validity bits derived from them.
- [ ] Each point where a value becomes public by protocol is identified.

## Control-flow leakage

- [ ] Secret-dependent branches are eliminated or replaced with
      constant-time selection.
- [ ] Loop bounds and iteration counts do not depend on a secret's value
      or bit length (no skipping of leading zero bits or limbs).
- [ ] Error handling paths do not branch on secret validity.
- [ ] Retry and abort logic does not expose secret-dependent behavior.
- [ ] Constant-time result types are not turned into a branch while the
      value is still secret (a masked choice converted to a boolean, an
      optional matched before the outcome is public).
- [ ] Functions documented or named as variable-time are called only with
      public inputs; every call site is listed with its argument origin.
- [ ] Equality checks on tags, MACs, hashes of secrets, and re-encryption
      results are constant-time over the full length; no `==`, `memcmp`,
      or derived equality on secret-derived bytes.

## Memory and cache leakage

- [ ] Table lookups are not indexed by secret material, or the whole
      table is scanned with constant-time selection.
- [ ] Cache-line dependent access patterns are analyzed and mitigated;
      table-based cipher fallbacks are not used where a cache is shared.
- [ ] Buffer length and alignment decisions avoid secret-dependent
      variation: no trimmed leading zeros, variable-length encodings, or
      allocation sizes derived from a secret.

## Arithmetic and instruction timing

- [ ] Variable-time modular reduction hotspots are identified and bounded:
      final subtractions and normalisations on secrets are masked.
- [ ] No division or remainder instruction takes a secret operand,
      division by a public constant included; confirmed in the binary.
- [ ] Hardware-specific instructions are reviewed for data-dependent
      latency per target, and reliance on a data-independent-timing CPU
      mode is explicit.
- [ ] Big-integer operations avoid secret-dependent short-circuit
      behavior: no general-purpose bignum type carries a secret.
- [ ] Modular inversion of a secret uses a constant-time algorithm,
      fixed-exponent exponentiation, or blinding.
- [ ] Scalar multiplication and exponentiation on secrets use a
      fixed-length ladder or fixed windows with constant-time selection.

## Compiler and build configuration

- [ ] Compiler optimization levels preserve constant-time assumptions,
      checked in the release binary for each shipped target.
- [ ] Feature-flag combinations do not switch to variable-time fallbacks.
- [ ] Benchmark and debug paths do not ship into production security
      profiles.
- [ ] Constant-time evidence names a compiler version, target, profile,
      and feature set, and is redone when any of them changes.
- [ ] Targets without instruction-level timing guarantees (interpreters,
      JIT runtimes, WebAssembly) are recorded as residual risk.

## Operational and lifecycle behavior

- [ ] Zeroization is present on hot and error paths.
- [ ] Logging does not include secret-derived validity cues, and distinct
      errors for secret-dependent causes do not reach the input's sender.
- [ ] Power-analysis amplifiers (retries, loops, repeated branching) are
      minimized.
- [ ] Where a physical observer is in scope, blinding or masking is
      identified and uses fresh randomness per operation; claims without
      measurement are marked as such.

## Prover-side leakage

- [ ] Every proving path over private witness data whose timing, logs, or
      inputs another party can observe is reviewed against
      `references/zk-prover-patterns.md`.
- [ ] Variable-time routines applied to witness-dependent scalars are
      listed with the observer who could time them.
