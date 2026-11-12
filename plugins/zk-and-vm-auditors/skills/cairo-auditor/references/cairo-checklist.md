# Cairo Audit Checklist

Record first whether the target is Cairo 0 or Cairo 1, a Starknet contract or
a standalone provable program, and the compiler version.

## Hint validation

- [ ] Every hint output is constrained by at least one assertion or range
      check that would reject an arbitrary felt252.
- [ ] Hint functions do not silently discard error cases or return a default.
- [ ] Hint-provided field elements are bounded before use in arithmetic, and
      the constraints determine them uniquely (quotient and remainder
      range-checked, remainder < divisor, no wrap in the reconstruction).
- [ ] No hint output is used as a pointer or index without validation.
- [ ] Cairo 0: checks live in Cairo code, not inside `%{ %}`; array lengths
      and memory read from prover-filled segments are constrained; dicts are
      squashed or finalized before their contents are trusted.
- [ ] Standalone programs: the proof's consumer checks the program hash and
      the output encoding it relies on.

## felt252 overflow

- [ ] Arithmetic on felt252 accounts for wrapping past the Stark prime.
- [ ] Subtraction results are checked for underflow where signedness matters.
- [ ] Multiplication results are bounded when used as array indices or
      lengths.
- [ ] Division by zero is handled explicitly, and felt252 division (a modular
      inverse) is not used where integer division is meant.
- [ ] Ordering comparisons run on range-checked integer types. Cairo 0
      helpers (`assert_le`, `assert_nn`, `is_le`, and the `_felt` variants)
      are called with operands inside the helper's documented domain.
- [ ] Cairo 0 `Uint256` values from untrusted input pass `uint256_check`
      before arithmetic.
- [ ] Conversions among felt252, integer types, addresses, and L1 values
      fail on out-of-range input; none wraps or truncates silently.

## Builtin misuse

- [ ] range_check is applied to all untrusted felt252 before u128/u64
      conversion, and is not skipped because earlier arithmetic "implies"
      the value is small.
- [ ] Pedersen hash inputs are domain-separated to prevent collision across
      types; variable-length inputs bind their length.
- [ ] ec_op point inputs are validated as on-curve before the operation.
- [ ] Poseidon state is initialized correctly per the Starknet specification.
- [ ] Boolean-returning signature checks have their result asserted; (r, s)
      malleability does not break a uniqueness assumption.
- [ ] Cairo 0: each builtin pointer is advanced past every cell used and
      returned; a cell beyond the final pointer is not validated.

## Sierra-to-CASM soundness

- [ ] Sierra safety guarantees are not bypassed by inline CASM hints, custom
      libfuncs, or a non-default allowed-libfuncs list.
- [ ] Gas metering is consistent between Sierra IR and CASM execution; loops
      over caller-controlled lengths are gas-bounded.
- [ ] Library dispatch targets are validated (no arbitrary code execution via
      a felt252 class hash); likewise class replacement and deploy syscalls.
- [ ] The declared CASM is reproducible from the audited Sierra with the
      stated compiler version.
- [ ] Assumptions about panics and failed inner calls (what reverts, what
      state persists) match the targeted Starknet version.

## Storage layout

- [ ] Storage variable addresses do not collide (Pedersen(selector, keys)).
- [ ] Mapping key domains do not overlap across different mappings; storage
      names in embedded components are unique within the contract.
- [ ] Upgrade proxy storage slots follow ERC-1967 or the Starknet equivalent;
      layout is preserved across class replacement.

## Starknet contract surface

- [ ] Every `#[l1_handler]` checks `from_address` against the expected L1
      contract; L1 consumers check the L2 sender.
- [ ] L1<->L2 payload encodings agree on both sides (u256 as two felts,
      values below the Stark prime, address widths); an unconsumable message
      has a recovery path.
- [ ] Account contracts verify the signature over the transaction hash in
      `__validate__`, restrict who may call `__execute__`, and handle
      transaction versions explicitly.
- [ ] Callers of `is_valid_signature` compare with the standard success
      value, not truthiness.
- [ ] Off-chain signed messages bind chain id, the verifying contract or
      account, and a nonce or expiry; no signature replays across chains,
      contracts, or calls.
