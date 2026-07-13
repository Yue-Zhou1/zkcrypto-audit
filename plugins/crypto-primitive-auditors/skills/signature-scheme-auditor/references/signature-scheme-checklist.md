# signature-scheme-auditor Checklist

## ECDSA (FIPS 186-5; SEC 1 v2.0)

- [ ] r and s are both validated in [1, n-1] before any arithmetic; r = 0
      or s = 0 must reject (a zero r with a permissive implementation can
      verify against crafted keys).
- [ ] The message hash is truncated to the leftmost bits when the hash is
      longer than the curve order (FIPS 186-5 §6.4.1); mismatched
      truncation between signer and verifier is a cross-implementation
      divergence.
- [ ] Public keys are validated: on-curve, not the identity, and in the
      prime-order subgroup for curves with cofactor > 1 (SEC 1 §3.2.2 full
      public key validation).
- [ ] Malleability policy is explicit: (r, s) and (r, n - s) both satisfy
      the equation; consumers keying on signature bytes (dedup, consensus,
      txids) need low-s normalization or documented acceptance.
- [ ] The verifier computes u1 = e·s^-1, u2 = r·s^-1 and checks
      R = u1·G + u2·Q with R != infinity, comparing r ≡ R.x mod n — not a
      byte comparison against an unreduced coordinate.
- [ ] No secret-dependent branches/lookups in scalar arithmetic (route
      depth to `side-channel-auditor`).

## Schnorr / BIP-340

- [ ] Public keys are 32-byte x-only; lift_x selects the even-Y point and
      FAILS for x >= p or non-residue — no implicit reduction.
- [ ] Challenge e = tagged_hash("BIP0340/challenge", r || pk || m) — tag
      separation exactly as specified; homemade tag strings break
      cross-implementation compatibility and domain separation.
- [ ] Verification checks R = s·G - e·P, requires R not infinity and R.y
      even, and r == R.x — all three; skipping the even-Y check accepts
      forged negated-R signatures.
- [ ] s < n enforced on decode.
- [ ] Batch verification (if present) uses proper random weighting;
      deterministic or unit weights let crafted signature sets cancel.

## EdDSA / Ed25519 (RFC 8032)

- [ ] s is checked < L on decode (RFC 8032 §5.1.7 step 1); accepting
      s >= L admits trivially malleable signatures.
- [ ] Point decodings reject non-canonical encodings (y >= p) per the
      implementation's documented policy; document whichever policy exists
      and its consensus implications (ed25519 validation criteria differ
      across libraries — the Chalkias et al. taxonomy).
- [ ] Small-order/mixed-order A and R handling is explicit; cofactored
      verification (8·s·G = 8·R + 8·k·A) vs cofactorless changes which
      signatures verify.
- [ ] Batch verification and single verification use the SAME equation
      family; batch-cofactored + single-cofactorless yields
      accept/reject divergence for the same signature (consensus split).
- [ ] Ed25519ph/Ed25519ctx variants: prehash flag and context string are
      bound exactly per RFC 8032 §5.1; contexts are not silently ignored.

## RSA-PSS and PKCS#1 v1.5 (RFC 8017)

- [ ] PSS verification enforces the expected salt length policy
      (sLen match or documented flexible policy) and the trailer byte
      0xBC; MGF1 hash choices match the negotiated parameters.
- [ ] v1.5 verification parses the DigestInfo STRICTLY: exact prefix
      match, no trailing bytes after the digest, no flexible
      length/parameter tolerance (Bleichenbacher'06 signature forgery
      against e = 3 lenient parsers).
- [ ] Preferred v1.5 check is re-encode-and-compare, not parse.
- [ ] Modulus/exponent sanity: e odd, > 1; key size >= policy minimum;
      signature interpreted as an integer < n (reject s >= n rather than
      reducing).

## Cross-cutting

- [ ] Signing paths derive nonces per RFC 6979 / RFC 8032 — hand the
      generation/lifecycle review to `randomness-auditor`.
- [ ] Hash function agility: the (scheme, curve, hash) triple is fixed by
      protocol or negotiated authentically — no attacker-chosen hash.
- [ ] Cross-protocol key reuse (same key in ECDSA and Schnorr, or Ed25519
      and X25519) is documented and justified.
- [ ] Verify-after-sign (or an equivalent fault check) exists where signing
      hardware/environment faults are in the threat model; route fault
      analysis onward to implementation-safety skills.
