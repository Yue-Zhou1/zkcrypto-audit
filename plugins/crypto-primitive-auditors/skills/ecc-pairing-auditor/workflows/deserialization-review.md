# Deserialization Review

Review every external point and scalar intake path in strict order.

1. **Inventory intake sites.** Identify every parser, decompressor, and
   `_unchecked` constructor:
   `grep -rnE "from_(bytes|compressed)|deserialize|_unchecked|Validate::No"`.
   For each, record the data source (network, calldata, storage, config),
   the curve and group, and the type produced.

2. **Read what the decoder checks.** Open the called function in
   the pinned library version and record, separately: field-element range,
   curve equation, subgroup membership, identity policy, canonical form.
   Do not infer any of them from the function name.

3. **Build the intake table.** One row per site: group, cofactor,
   on-curve, subgroup, canonical, identity policy, first use. Verify
   `is_on_curve()` (or its equivalent) is enforced before any group
   operation, and `is_in_correct_subgroup_assuming_on_curve()` before
   pairing or signature use. For cofactor-1 groups the subgroup column is
   not applicable; for every other group a blank is a candidate (P2).

4. **Trace each row to its first use.** Between decode and the first group
   operation, pairing, or hash of the encoding, name the line that closes
   each blank. A check that lives in a different caller is caller
   discipline: record it as a finding candidate and list the callers that
   omit it (P1).

5. **Check encoding rules.** Check compressed encodings for sign-bit
   conventions and identity handling. For each format, decide by reading
   the decoder (or a unit test where the environment allows) what happens
   to: a coordinate at or above the modulus, an infinity flag with nonzero
   payload, a malformed infinity encoding, `(0,0)` or an equivalent affine
   placeholder, wrong length, trailing bytes, an on-curve point outside
   the subgroup. Each accepted case is P3 or P2; `(0,0)` accepted as an
   ordinary point is a bug.

6. **Look for side doors.** Search for `Default`, derived deserialization,
   `From` conversions, and public fields on the validated type. Any route
   that builds it without the checks reopens every row.

7. **Review scalars and batch helpers.** Check scalar range validation
   before multiplication or multi-scalar routines, and how out-of-range
   bytes are treated (reject or reduce). Review `batch_invert()` and
   similar helpers for zero-input hazards, and multi-scalar calls for
   mismatched lengths.

8. **Flag secret-scalar paths.** Any site whose output is multiplied by a
   long-term secret is reviewed first and reported with P11 if any column
   is blank.

## Failure rules

- A row is not closed by the decoder's name or documentation summary; it
  needs the line that performs the check.
- "Validated upstream" needs the upstream call site for every caller.
- If the library source for the pinned version cannot be read, the row is
  `unverified`, not passed.
