# ecc-pairing-auditor Finding Patterns

## P1: Parsed objects used before validation

- **Pattern:** deserialized points or scalars reach group operations before
  on-curve and subgroup checks, or validation is left to caller discipline.
- **Impact:** every later equation runs on values outside the group.

## P2: Missing subgroup or on-curve checks

- **Pattern:** `pairing(pk, hash_to_g2(msg)) == pairing(g1_gen(), sig)` with
  no `is_on_curve()` and `is_in_correct_subgroup_assuming_on_curve()` on
  `pk` and `sig` first.
- **Impact:** the pairing is undefined outside the prime-order subgroups and
  the BLS draft warns of forgeries; these are not hypothetical parser bugs.

## P3: Non-canonical encodings accepted

- **Pattern:** multiple byte encodings decode to one object: unreduced
  coordinates, loose flag bits, alternative infinity forms, `(0,0)`.
- **Impact:** breaks binding and parser assumptions: replay past
  deduplication, and implementations that disagree on validity.

## P4: Identity accepted as key, signature, or equation term

- **Pattern:** no identity rejection on public keys or aggregate keys, or
  an attacker-supplied point that zeroes a pairing term.
- **Impact:** identity key with identity signature verifies for any
  message; keys `pk` and `-pk` aggregate to it.

## P5: Rogue-key aggregation

- **Pattern:** keys enter an aggregate without a verified proof of
  possession or message augmentation, or the PoP shares the signing DST.
- **Impact:** `pk' = [x]G - pk_victim` cancels the victim's key; the
  attacker signs alone for the pair.

## P6: `hash_to_curve` and DST misuse

- **Pattern:** try-and-increment style constructions, hash-then-multiply
  of a generator, short or reused DST values, or a caller-supplied DST.
- **Impact:** known discrete log of the hash output or cross-protocol
  signature reuse; variable-time hashing of secret inputs.

## P7: Batch verification masking invalid items

- **Pattern:** coefficients that are predictable, zero, narrow, or fixed
  before the items; or a failed batch that still marks items verified.
- **Impact:** a bad signature or proof hides among valid items in a batch.

## P8: Pairing equation or group-role error

- **Pattern:** swapped arguments, a misplaced negation, public keys and
  signatures in exchanged groups, or a comparison of Miller-loop outputs
  without final exponentiation.
- **Impact:** the equation holds for inputs the specification rejects.

## P9: Field arithmetic and reduction mistakes

- **Pattern:** native integer arithmetic such as `(a as u64) * (b as u64)`
  where field multiplication `a * b` is meant, base-field and scalar-field
  values mixed, or unchecked `batch_invert()` and incomplete additions.
- **Impact:** wrong results at reduction boundaries and on edge inputs.

## P10: Optimized backend diverging from reference

- **Pattern:** a fast path (assembly, multi-Miller, prepared points)
  changes edge-case semantics or validation behavior.
- **Impact:** two builds or two clients disagree on the same input.

## P11: Secret scalar multiplied by an unvalidated point

- **Pattern:** key agreement or decryption multiplies a static secret by a
  peer point that skipped the on-curve or subgroup check.
- **Impact:** invalid-curve and small-subgroup attacks recover the secret.
