# ECC Checklist

Use this checklist when reviewing elliptic-curve arithmetic and point handling.

## Point validity on intake

- [ ] Point validity on deserialization: every externally supplied point is
      verified to be on the curve before any operation
- [ ] Coordinates are canonical field elements (below the modulus) before
      the curve equation is evaluated; nothing is reduced silently
- [ ] Subgroup membership check: the point is verified to be in the correct
      `r`-torsion subgroup (`is_in_correct_subgroup_assuming_on_curve()` or
      the library's equivalent) before pairing or signature use
- [ ] Every `_unchecked` constructor or validation-skipping decode is
      listed, and each reads only data validated when it was written
- [ ] No other route (`Default`, derived deserialization, raw field access)
      builds the validated point type

## Subgroup, cofactor, and twist handling per curve family

- [ ] Each group in use is recorded with its cofactor: 1 for secp256k1,
      P-256, and BN254 G1; above 1 for BN254 G2, BLS12-381 G1 and G2, and
      Curve25519/edwards25519. The on-curve-only shortcut is applied to
      cofactor-1 groups alone
- [ ] Cofactor clearing on G2: BLS12-381 G2 has a large non-trivial cofactor
      and must be cleared or validated explicitly; BLS12-381 G1 and BN254
      G2 need the same treatment
- [ ] Received points are membership-checked, not cofactor-cleared,
      wherever the point must equal a value committed or signed elsewhere
- [ ] Endomorphism-based fast subgroup checks are tested against the
      definitional check `[r]P = identity` on points outside the subgroup
- [ ] Cofactor-8 curves: the protocol states one rule (multiply by the
      cofactor, reject small-order points, or use a prime-order encoding
      such as ristretto255) and single and batch paths apply the same rule
- [ ] A secret scalar is never multiplied by a point that has not passed
      the on-curve check (invalid-curve attack)
- [ ] x-only ladders are used only on twist-secure curves, or the input is
      checked to be on the curve and not its twist
- [ ] Key-agreement outputs are checked for the identity or all-zero value
      where the protocol needs both parties to contribute

## Encoding and canonical form

- [ ] Point compression sign bit: compressed encoding uses the correct sign
      convention for the chosen curve
- [ ] Rejection of (0,0): malformed affine encodings are not accepted as
      ordinary non-identity points; where a format defines (0,0) as the
      identity it is handled as identity and never fed to affine formulas
- [ ] Flag bits are consistent: an infinity flag with nonzero payload and
      unused or contradictory flag bits are rejected
- [ ] Each accepted byte string is the unique encoding of its point;
      lengths are exact and trailing bytes are rejected
- [ ] Extension-field coefficient order and byte order match the wire
      format in use, confirmed with a known vector

## Scalars, identity, and exceptional cases

- [ ] Scalar range validation: scalars passed into multiplication are in
      `[0, r)`; canonical decoding rejects larger values where uniqueness
      matters
- [ ] Secret scalars derived from bytes use wide reduction or rejection
      sampling, and a zero secret key is rejected
- [ ] Base-field and scalar-field elements are distinct types; conversion
      between them is explicit and range-checked
- [ ] Field values are never multiplied or added as native integers; every
      explicit reduction boundary is audited
- [ ] Point at infinity / identity handling: identity behavior is correct
      without secret-dependent branching
- [ ] The identity is rejected wherever the protocol gives it no meaning:
      public keys, commitments, key-agreement inputs
- [ ] Coordinate system consistency: affine, projective, and Jacobian
      conversions preserve semantics across mixed-model additions
- [ ] Incomplete addition formulas are not reachable with `P + P`,
      `P + (-P)`, or an identity operand from attacker-chosen inputs
- [ ] Batch inversion safety: `batch_invert()` over zero inputs is checked
      or replaced with a checked variant
- [ ] Multi-scalar multiplication rejects mismatched scalar and point
      counts instead of truncating to the shorter list

## Hash to curve

- [ ] The RFC 9380 suite is named, matches the protocol specification, and
      uses the random-oracle (`_RO_`) variant where the proof assumes one
- [ ] No try-and-increment construction, and no hash-then-multiply of a
      generator, stands in for hash-to-curve
- [ ] The DST is a non-empty constant, unique per protocol, suite, and
      version, not short, never reused, and never caller-controlled
- [ ] The output is cofactor-cleared as the suite specifies, and the
      implementation reproduces the RFC 9380 test vectors for its suite
