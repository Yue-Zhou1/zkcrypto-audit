# ECC Checklist

Use this checklist when reviewing elliptic-curve arithmetic and point handling.

- **Point validity on deserialization** — verify every externally supplied point is on the curve before any operation
- **Subgroup membership check** — verify the point is in the correct `r`-torsion subgroup with `is_in_correct_subgroup_assuming_on_curve()`
- **Cofactor clearing on G2** — BLS12-381 G2 has a large non-trivial cofactor and must be cleared or validated explicitly
- **Point at infinity / identity handling** — identity behavior must be correct without secret-dependent branching
- **Coordinate system consistency** — affine, projective, and Jacobian conversions must preserve semantics across mixed-model additions
- **Scalar range validation** — scalars passed into multiplication must be in `[0, r)`
- **Point compression sign bit** — compressed encoding must use the correct sign convention for the chosen curve
- **Rejection of (0,0)** — malformed affine encodings must not be accepted as ordinary non-identity points
- **Batch inversion safety** — `batch_invert()` over zero inputs must be checked or replaced with a checked variant
