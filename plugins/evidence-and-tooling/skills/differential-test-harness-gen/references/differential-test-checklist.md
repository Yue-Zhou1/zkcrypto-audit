# differential-test-harness-gen Checklist

## Implementations and versions

- [ ] The target entry point is precisely identified (function, API, CLI)
      with its exact version/commit.
- [ ] At least one reference implementation is chosen for correctness
      authority; two references let a divergence be attributed rather than
      just detected. Versions are pinned (lockfile/commit).
- [ ] Language/FFI boundaries are accounted for: the harness calls each
      implementation through a stable interface, not a reimplementation.

## Vector and corpus sources

- [ ] Official vectors are used where they exist: NIST CAVP/ACVP for
      FIPS primitives, RFC test vectors for RFC-defined schemes.
- [ ] Project Wycheproof is included where it covers the primitive (it
      encodes known edge cases and past CVEs — the highest-value source).
- [ ] A generated boundary corpus supplements official vectors: field
      edges (0, 1, n-1, n, n+1), non-canonical encodings, wrong lengths,
      identity/small-order points, malformed padding.
- [ ] The corpus is versioned and committed so runs are reproducible.

## Normalization of result/error semantics

- [ ] Each implementation's outcome is mapped to a common verdict:
      {ACCEPT, REJECT, ERROR/panic, TIMEOUT}. Cosmetic differences
      (exception type, error string, return code) must NOT count as
      divergences; a genuine accept-vs-reject split MUST.
- [ ] "Reject" vs "error" is distinguished deliberately — some divergences
      only matter as one or the other (e.g., a panic on malformed input is
      a DoS finding even when both would ultimately reject).
- [ ] Output values (ciphertexts, signatures, shared secrets, hashes) are
      compared byte-exactly after canonicalization the spec permits, and
      NOT after canonicalization it does not.

## Determinism and reproduction

- [ ] All randomness is seeded and recorded; derandomized/KAT entry points
      are used where the primitive is otherwise randomized.
- [ ] Every divergence has a standalone reproduction command that reruns
      just that input against both implementations.
- [ ] The harness is hermetic: pinned toolchain, no network, no wall-clock
      dependence.

## Evidence handoff

- [ ] Divergences are packaged as a corpus (inputs + observed verdicts per
      implementation) plus reproduction commands.
- [ ] The handoff states which divergence is a candidate finding vs a
      benign spec-permitted difference, and routes candidates to
      `crypto-fp-check` — this skill produces evidence, it does not
      adjudicate severity.
