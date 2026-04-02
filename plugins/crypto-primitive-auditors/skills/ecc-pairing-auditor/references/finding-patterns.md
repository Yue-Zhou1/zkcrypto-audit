# Finding Patterns

Actively hunt these ECC and pairing failure modes.

| Pattern | Why it matters |
|---|---|
| Parsed objects used before validation | Deserialized points or scalars reach group operations before on-curve/subgroup checks |
| Missing subgroup/on-curve checks | Small-subgroup inputs make pairing outcomes predictable and can enable forgery |
| Non-canonical encodings accepted | Multiple byte encodings for one object break binding and parser assumptions |
| Batch verification masking invalid items | A bad signature or proof hides among valid items in a batch |
| Optimized backend diverging from reference | Fast paths change edge-case semantics or validation behavior |

## Missing subgroup validation

```rust
fn bad_verify(pk: G1Affine, msg: &[u8], sig: G2Affine) -> bool {
    pairing(pk, hash_to_g2(msg)) == pairing(g1_gen(), sig)
}

fn good_verify(pk: G1Affine, msg: &[u8], sig: G2Affine) -> bool {
    assert!(pk.is_on_curve() && pk.is_in_correct_subgroup_assuming_on_curve());
    assert!(sig.is_on_curve() && sig.is_in_correct_subgroup_assuming_on_curve());
    pairing(pk, hash_to_g2(msg)) == pairing(g1_gen(), sig)
}
```

Small-subgroup points are not hypothetical parser bugs; they are direct
signature-forgery candidates.

## Field arithmetic and reduction mistakes

```rust
use ark_ff::Field;

let wrong = (a as u64) * (b as u64);
let reduced = a * b;
```

Prefer field-element types over native integer arithmetic, and audit every
explicit reduction boundary.

## `hash_to_curve` and DST misuse

```rust
use bls12_381::hash_to_curve::HashToCurve;

let p = G1::hash_to_curve(msg, DST);
```

Reject try-and-increment style constructions and short or reused DST values.
