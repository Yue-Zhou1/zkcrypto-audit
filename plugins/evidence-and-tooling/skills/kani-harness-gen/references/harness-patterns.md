# Kani Harness Patterns

Template harnesses for common crypto verification targets.

## Field arithmetic correctness

```rust
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(4)]
fn verify_field_mul_inverse() {
    let a: u64 = kani::any();
    kani::assume(a != 0 && a < MODULUS);
    let inv = field_inverse(a);
    let product = field_mul(a, inv);
    assert_eq!(product, 1, "a * inverse(a) must equal 1");
}
```

## No-panic guarantee

```rust
#[cfg(kani)]
#[kani::proof]
fn verify_deserialize_no_panic() {
    let bytes: [u8; 32] = kani::any();
    // Should not panic on any input — may return Err, but must not abort
    let _ = Point::from_bytes(&bytes);
}
```

## Serialization roundtrip

```rust
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(4)]
fn verify_serialize_roundtrip() {
    let x: u64 = kani::any();
    kani::assume(x < MODULUS);
    let element = FieldElement::from(x);
    let bytes = element.to_bytes();
    let recovered = FieldElement::from_bytes(&bytes).unwrap();
    assert_eq!(element, recovered);
}
```

## Constraint soundness

```rust
#[cfg(kani)]
#[kani::proof]
#[kani::unwind(8)]
fn verify_constraint_rejects_invalid_witness() {
    let witness: u64 = kani::any();
    let public_input: u64 = kani::any();
    kani::assume(public_input < MODULUS);
    // If the constraint system accepts, the statement must be true
    if constraint_check(witness, public_input) {
        assert!(statement_holds(witness, public_input));
    }
}
```

## Lightweight property fallback

- Use `proptest` with `PROPTEST_CASES` for fast deterministic checks when Kani cannot run
- Prefer simple algebraic/roundtrip invariants for fallback coverage
- Promote failing `proptest` examples into dedicated Kani harnesses when environment permits
