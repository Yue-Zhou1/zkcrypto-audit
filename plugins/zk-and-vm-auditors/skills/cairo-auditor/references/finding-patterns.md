# cairo-auditor Finding Patterns

## P1: Unvalidated hint output trusted by constraints

- **Pattern:** a hint provides a value used directly in a constraint without
  independent validation, or validated by a relation with no range checks.
- **Impact:** the attacker-prover substitutes any value that satisfies it.

## P2: Hint error path silently returns zero

- **Pattern:** a hint catches an error and returns felt252(0), not a failure.
- **Impact:** the proof succeeds with wrong data.

## P3: Hint-provided witness used as array index

- **Pattern:** an unbounded felt252 from a hint indexes a fixed-size array
  or is used as a pointer.
- **Impact:** out-of-bounds panic or wrapping; in Cairo 0, a read of memory
  the prover fills freely.

## P4: felt252 arithmetic wrapping silently

- **Pattern:** a larger felt252 is subtracted from a smaller one, or a
  product exceeds the Stark prime, with no bound on the operands.
- **Impact:** a large positive number where the logic expected a negative
  value or an error; balance and bound checks pass.

## P5: Range check missing or skipped for "known" values

- **Pattern:** a felt252 is assumed to fit in u128 with no explicit range
  check, or the check is skipped because prior arithmetic seems to bound it.
- **Impact:** values above 2^128 pass through; the attacker-prover injects
  any value before the unchecked path.

## P6: Division treated as integer division

- **Pattern:** felt252 division is used where floor division is meant.
- **Impact:** a modular-inverse product, not a truncated quotient.

## P7: Comparison helper outside its domain

- **Pattern:** Cairo 0 `assert_le`/`assert_nn`/`is_le` on operands never
  range-checked, or `Uint256` arithmetic without `uint256_check`.
- **Impact:** a wrapped difference passes the comparison; limb overflow
  yields values the library functions do not define.

## P8: Pedersen hash without domain separation

- **Pattern:** two data structures hash to the same Pedersen output because
  neither prefixes a type tag or binds its length.
- **Impact:** a commitment or storage key for one type is accepted as another.

## P9: ec_op on unvalidated point

- **Pattern:** a point from calldata reaches ec_op with no on-curve check.
- **Impact:** invalid-curve attacks on the scalar or the result.

## P10: Inline CASM bypasses Sierra safety

- **Pattern:** raw CASM hints, custom libfuncs, or a non-default
  allowed-libfuncs list (such as `experimental`) bring in code outside the
  audited libfunc set, where Sierra gas metering and type safety are not
  assured.
- **Impact:** resource exhaustion or type confusion.

## P11: Library dispatch via unchecked class hash

- **Pattern:** `library_call` or class replacement takes a felt252 class
  hash from storage or calldata without checking it is an expected class.
- **Impact:** arbitrary code runs in the contract's storage context.

## P12: Unauthenticated message or replayable signature

- **Pattern:** an `#[l1_handler]` that ignores `from_address`, or a signed
  message hash without chain id, contract address, or nonce.
- **Impact:** anyone mints or withdraws through the handler; a signature is
  replayed on another chain, contract, or call.
