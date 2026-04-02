# Finding Patterns

Actively hunt these Rust implementation hazards during every crypto audit.

| Pattern | Why it matters |
|---|---|
| Feature flags changing security semantics | Validation, constant-time behavior, or internal state exposure changes between builds |
| `unchecked` constructors exposed too widely | External callers can bypass invariants and pass invalid cryptographic objects into trusted code |
| Secret-dependent timing | Branches, early returns, indexing, or variable-time comparisons leak secret-dependent behavior |
| Unsound `unsafe impl Send/Sync` | Raw pointers or interior mutability can race across threads and corrupt security state |
| Zeroization gaps | Secrets linger in memory after logical lifetime ends |
| Unsafe conversion and deserialization shortcuts | `transmute`, `from_raw_parts`, and unchecked decoders turn malformed attacker input into trusted objects |

## Secret-dependent timing

```rust
use subtle::{Choice, ConditionallySelectable, ConstantTimeEq};

// BUG: branch depends on secret material
if secret_key[0] == 0 {
    return Err(Error::WeakKey);
}

// FIX: constant-time selection and comparison
let is_zero = secret_key[0].ct_eq(&0);
let selected = u8::conditional_select(&1, &0, is_zero);
debug_assert!(matches!(selected, 0 | 1));
```

Look for the same issue in `match`, table indexing, and early-return error paths.
Prefer `ConditionallySelectable` and `ct_eq()` over ordinary branching on secrets.

## Zeroization gaps

```rust
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Zeroize, ZeroizeOnDrop)]
struct SessionSecrets {
    nonce: [u8; 32],
    scalar: [u8; 32],
}

fn compute(secret: &[u8; 32]) {
    let mut scratch = secret.to_vec();
    // BUG: scratch survives unless explicitly zeroized
    scratch.zeroize();
}
```

Audit clones, buffers, temporary `Vec<u8>` allocations, and retry caches. The
primary type being zeroized is not enough if copies remain elsewhere.

## Unsafe shortcuts

```rust
use core::slice;

// BUG: layout and length assumptions are unchecked
let scalar: Scalar = unsafe { core::mem::transmute(bytes) };
let points = unsafe { slice::from_raw_parts(ptr as *const G1Affine, n) };
let point = unsafe { G1Affine::from_uncompressed_unchecked(bytes) };
```

Each unsafe shortcut needs a concrete invariant and a caller that actually
proves it. If the invariant depends on attacker-controlled bytes, treat it as a
bug candidate until disproven.
