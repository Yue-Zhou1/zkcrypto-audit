# Deserialization Review

Review every external point and scalar intake path in strict order.

## Phase 1: Point parsing

- Identify every parser, decompressor, and `_unchecked` constructor
- Verify `is_on_curve()` is enforced before any group operation
- Verify `is_in_correct_subgroup_assuming_on_curve()` is enforced before pairing or signature use

## Phase 2: Encoding rules

- Check compressed encodings for sign-bit conventions and identity handling
- Reject malformed infinity encodings and non-canonical byte forms
- Treat `(0,0)` acceptance or equivalent malformed affine placeholders as bugs

## Phase 3: Scalar and batch helpers

- Check scalar range validation before multiplication or multi-scalar routines
- Review `batch_invert()` and similar helpers for zero-input hazards
- If validation depends on caller discipline, record it as a finding candidate
