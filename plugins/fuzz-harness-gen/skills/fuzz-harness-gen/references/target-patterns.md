# Fuzz Target Patterns

Template fuzz targets for common cryptographic attack surfaces.

## Deserialization fuzzing

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let _ = Type::from_bytes(data);
});
```

## Point decompression

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let _ = CurvePoint::decompress(data);
});
```

## Proof verification

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|(seed_proof: Vec<u8>, mutator: Vec<u8>)| {
    // Prefer corpus-provided valid seeds so verifier paths are exercised often.
    if let Ok(mut proof) = Proof::decode(&seed_proof) {
        mutate_proof(&mut proof, &mutator); // mutated proof coverage
        let _ = verify_proof(&proof);
    }
});
```

## Hash-to-curve and transcript APIs

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    let _ = hash_to_curve(data);
    let _ = transcript_absorb(data);
});
```

## Circuit synthesize with random inputs

```rust
#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|witness: Vec<u8>| {
    if let Ok(inputs) = decode_random_witness(&witness) {
        let _ = circuit_synthesize(inputs);
    }
});
```

## Lightweight property fallback

- Use `proptest` for fast deterministic checks in CI when full fuzzing budget is unavailable
- Promote failing property cases into fuzz corpus for deeper exploration
