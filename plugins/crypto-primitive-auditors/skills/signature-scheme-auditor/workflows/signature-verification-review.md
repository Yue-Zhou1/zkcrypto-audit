# signature-verification-review.md

Executable review workflow for classical signature verification and signing
paths.

1. **Inventory schemes.**
   `grep -rn "verify\|ecdsa\|schnorr\|ed25519\|eddsa\|pkcs1\|pss\|secp256k1\|p256"`
   and build a table: (scheme, curve, hash) -> library/backend -> caller.
   Record the governing standard for each triple and which library layer
   implements the equation vs which the target hand-rolls.

2. **Decode rules first.** For each scheme, review signature and key
   decoding against the checklist's range/canonicality items (r/s ranges,
   s < L, lift_x failure cases, DigestInfo strictness). Permissive decode
   is the root of most verification bugs.

3. **Verify the verification equation.** Compare the implemented equation
   term-by-term with the standard (SEC 1 / BIP-340 / RFC 8032 / RFC 8017),
   including the rejection conditions (infinity R, odd Y, trailer byte).
   For hand-rolled code, reproduce the equation in a reference script and
   cross-test with a known-good library on edge vectors (zero, n-1,
   small-order points, non-canonical encodings — Wycheproof vectors where
   available).

4. **Check public-key validation** at every entry point that accepts keys
   from outside the trust boundary.

5. **Check malleability posture.** Determine whether any consumer keys on
   signature bytes; if so, verify normalization (low-s, canonical s) or
   document the exposure.

6. **Compare batch and single paths.** If batch verification exists,
   diff the acceptance sets: equation family (cofactored?), weighting
   randomness, and canonicality checks must align with the single path.

7. **Check hash semantics.** Truncation rule, prehash variants, context
   strings, and cross-protocol hash-domain reuse.

8. **Check signing-side integration.** Nonce derivation calls (RFC 6979 /
   RFC 8032) — route lifecycle concerns to `randomness-auditor`; check
   verify-after-sign posture where faults are in the threat model.

9. **Produce the output contract.** For each candidate fill
   `signature_family`, `verification_or_signing_path`,
   `equation_or_encoding_invariant`, `evidence` (edge-vector test results
   for Critical/High), `disposition`, and `next_route`
   (`crypto-fp-check`; cross-route per the When NOT to Use table).
