# Finding Patterns

Actively hunt these threshold-signing failure modes.

| Pattern | Why it matters |
|---|---|
| Nonce reuse via shared state or retries | Reused signing nonces turn signature equations into key-recovery equations |
| Missing participant or session binding | Messages or shares migrate across sessions or identities |
| Share verification omitted or incomplete | Malicious shares poison DKG or signing rounds |

## Nonce reuse example

```rust
fn bad_sign(sk: &Scalar, msg: &[u8]) -> Signature {
    let k = hash_to_scalar(sk.to_bytes());
    schnorr_sign_with_nonce(sk, msg, k)
}

// FIX: RFC 6979 style deterministic nonce binds both secret and message
fn good_sign(sk: &Scalar, msg: &[u8]) -> Signature {
    let k = rfc6979_nonce(sk, msg);
    schnorr_sign_with_nonce(sk, msg, k)
}
```

Two different messages with the same nonce produce two equations and enable
**private key recovery**. In threshold settings, the same risk appears when
session state is reused or a FROST participant reuses a nonce pair across
sessions, enabling Wagner generalized-birthday attacks.

Always review retries, crash recovery, and cache reuse as carefully as the main
happy path.
