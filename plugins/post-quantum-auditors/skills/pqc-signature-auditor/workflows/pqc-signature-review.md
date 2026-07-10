# pqc-signature-review.md

Executable review workflow for stateless PQ signatures: ML-DSA (FIPS 204),
SLH-DSA (FIPS 205), and FN-DSA/Falcon (pre-standard). For XMSS/LMS/HSS use
`stateful-hash-signature-review.md`.

1. **Pin scheme, parameter set, and version.** Inspect encodings and
   constants to distinguish FIPS-final from round-3 code (P8). For
   Falcon, record the pre-standard status from
   `references/spec-sources.md` in the output.

2. **Run KATs** against final-standard/ACVP vectors.

3. **Audit the signing loop (ML-DSA).**
   `grep -rn "reject\|gamma\|hint\|norm\|infinity"`: verify every bound
   (z, r0, ct0, hint count omega) is present with the spec's constants,
   loop limits are handled per spec, and rejection reasons don't leak
   (P2/P3; route timing to `side-channel-auditor`).

4. **Audit hashing structure (SLH-DSA).** ADRS types per call site, WOTS+
   checksum generation AND verification, FORS index mapping, opt_rand
   sourcing (P5/P6).

5. **Audit the sampler (Falcon).** Compare SamplerZ against the reference
   constant-time design; flag floating-point paths (P7).

6. **Check signing modes.** Hedged vs deterministic explicitly chosen and
   documented; deterministic mode plus fault exposure -> P4, recommend
   hedging or verify-after-sign; route rnd/opt_rand lifecycle to
   `randomness-auditor`.

7. **Audit verification.** Every norm/weight/checksum bound, canonical
   encoding enforcement, ctx binding, and prehash domain separation.

8. **Produce the output contract**: `signature_family_and_parameter_set`,
   `sign_or_verify_path`, `state_or_sampling_invariant`, `evidence`
   (spec-section citation + code path; Critical/High need a forgery or
   leakage PoC sketch), `disposition`, `next_route`.
