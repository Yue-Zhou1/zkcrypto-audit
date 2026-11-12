# side-channel-auditor Finding Patterns

## P1: Branch on secret scalar bit

- **Pattern:** double-and-add or square-and-multiply branches on each key
  or nonce bit, or any `if` whose condition derives from a secret.
- **Impact:** the scalar is readable from timing or a power trace.

## P2: Precomputed table indexed by secret nibble

- **Pattern:** windowed scalar multiplication or a table-based cipher
  loads `table[secret_window]` directly.
- **Impact:** cache state reveals the index to a co-located observer.

## P3: Compiler optimization reintroduces branch

- **Pattern:** masked selection or subtraction in source becomes a
  conditional jump in the release binary for some compiler or target.
- **Impact:** a constant-time claim true in source fails in the artifact.

## P4: Zeroization omitted on hot path

- **Pattern:** keys, nonces, or intermediates stay in stack or heap
  buffers after use, especially on early-return and error paths.
- **Impact:** secrets remain in memory for later disclosure.

## P5: Error timing leaks secret validity

- **Pattern:** failure latency, error code, or log output differs with a
  secret-dependent check (padding, tag, decoding).
- **Impact:** an oracle the attacker queries with chosen inputs.

## P6: Early-exit comparison of secret-derived bytes

- **Pattern:** `==`, `memcmp`, or derived equality on a MAC, tag, hash of
  a secret, or re-encrypted ciphertext.
- **Impact:** byte-by-byte recovery of the expected value.

## P7: Variable-time bignum or inversion on a secret

- **Pattern:** a general-purpose big-integer type, or a Euclid or binary
  GCD inversion, processes a key, nonce, or share.
- **Impact:** limb and iteration counts leak the operand; nonce leakage
  leads to key recovery.

## P8: Secret-dependent division or reduction

- **Pattern:** `/` or `%` with a secret operand, or a branched final
  subtraction in modular reduction.
- **Impact:** instruction latency or the branch reveals the operand.

## P9: Variable-time routine called with a secret

- **Pattern:** a verification-oriented or explicitly variable-time
  routine is reused for signing, decryption shares, or proving.
- **Impact:** its data-dependent schedule exposes the scalar.

## P10: Secret-dependent length or iteration count

- **Pattern:** a loop runs for the bit length of a nonce, an encoding
  strips leading zeros of a shared secret, or try-and-increment runs on a
  secret input.
- **Impact:** leaks top bits or the size class; enough for nonce attacks.

## P11: Feature or target fallback to a variable-time backend

- **Pattern:** a feature flag, `cfg`, or missing CPU extension selects a
  table-based or variable-time implementation.
- **Impact:** the audited constant-time path is not the one running.

## P12: Prover-side witness leakage

- **Pattern:** proof-generation time, logs, or a remote proving service
  expose witness-dependent behavior (`references/zk-prover-patterns.md`).
- **Impact:** private inputs leak although the proof is zero-knowledge.
