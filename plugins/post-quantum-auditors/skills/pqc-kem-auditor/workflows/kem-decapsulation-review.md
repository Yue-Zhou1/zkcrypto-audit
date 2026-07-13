# kem-decapsulation-review.md

Executable review workflow for ML-KEM implementations, centered on the
decapsulation/implicit-rejection path.

1. **Pin the spec version.** Determine whether the code implements FIPS
   203 final, the initial public draft, or round-3 Kyber (inspect the
   shared-secret derivation and G/H/J usage). Any mix is a P4 candidate;
   a conformance claim queues `spec-delta-checker`.

2. **Verify KATs.** Run the implementation's known-answer tests and
   confirm the vectors are FIPS-203-final/ACVP, not stale round-3.

3. **Audit input checks.**
   `grep -rn "decaps\|encaps\|from_bytes\|decode"` on the API boundary:
   public-key modulus check in Encaps, ciphertext/dk length checks in
   Decaps (P3).

4. **Trace Decaps end to end.** Confirm: decrypt -> re-derive (K', r') ->
   re-encrypt -> whole-ciphertext constant-time compare -> branchless
   select between K' and J(z || c). Flag any error return, exception,
   early exit, or log on mismatch (P1), and any branchy compare/select
   (P2; route measurement methodology to `side-channel-auditor`).

5. **Audit z.** Origin (keygen RBG), storage with dk, zeroization,
   non-reuse across keypairs (P6).

6. **Check compression/rounding.** Compare Compress/Decompress against
   the §4.2.1 formulas; exhaustively test the rounding boundary values
   per d (P5).

7. **Check encapsulation randomness.** m from an approved RBG; the
   derandomized/KAT entry point unreachable from production (P7); route
   RNG lifecycle to `randomness-auditor`.

8. **Review the downstream protocol.** Success and implicit-reject must
   produce identical protocol-visible behavior shapes (P8).

9. **Produce the output contract.** For each candidate fill
   `kem_family_and_parameter_set`, `encapsulation_or_decapsulation_path`,
   `failure_oracle_invariant`, `evidence` (spec section + code path;
   Critical/High need an oracle-demonstration sketch), `disposition`, and
   `next_route` (`crypto-fp-check`; `lattice-auditor` for parameter/noise
   design questions).
