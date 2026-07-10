# vrf-review.md

Executable review workflow for VRF provers, verifiers, and consumers.

1. **Pin the construction.** Identify RSA-FDH-VRF or the exact ECVRF
   ciphersuite (suite string octet). Record the RFC 9381 sections that
   govern it. If the code claims RFC conformance, queue a
   `spec-delta-checker` pass for the claim.

2. **Inventory the API surface.**
   `grep -rn "vrf\|prove\|proof_to_hash\|encode_to_curve\|validate_key\|beta\|gamma"`
   and map: keygen -> prove -> verify -> proof_to_hash -> consumer use.
   Flag immediately any consumer path that touches beta before verify
   returns VALID (P1).

3. **Check key validation** against the deployment's key model:
   adversarial keys demand validate_key (full uniqueness); trusted keys
   demand registration/attestation evidence (P2).

4. **Diff the hash invocations.** For each hash call, compare suite
   string, separation octets, and DSTs byte-for-byte against RFC 9381 /
   RFC 9380 (P4). Check encode_to_curve method matches the ciphersuite
   (TAI loop vs ELL2).

5. **Check the prover nonce.** Confirm §5.4.2 derivation, no reuse across
   alpha inputs, no RNG substitution; route lifecycle concerns (fork,
   snapshot, retry) to `randomness-auditor` (P5).

6. **Check verification completeness.** decode_proof range/canonicality
   checks, U/V recomputation, challenge re-derivation, and cofactor
   multiplication in proof_to_hash (P3, P6). For EC point decoding rules,
   cross-route to `ecc-pairing-auditor` when the curve library is itself
   in scope.

7. **Model application grinding.** Key-registration timing vs epoch seed,
   alpha selection freedom, withholding detectability/penalties, output
   truncation width (P7). Quantify achievable bias where possible.

8. **Produce the output contract.** For each candidate fill `vrf_family`,
   `prove_or_verify_path`, `uniqueness_or_pseudorandomness_invariant`,
   `evidence` (RFC section + code path; Critical/High need a forged-proof
   or bias PoC sketch), `disposition`, and `next_route`
   (`crypto-fp-check`; cross-routes per the When NOT to Use table).
