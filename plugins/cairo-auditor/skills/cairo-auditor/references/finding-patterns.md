# Cairo Finding Patterns

Common vulnerability patterns in Cairo and Starknet code.

## Hint-level

- **Unvalidated hint output trusted by constraints** — hint provides a value that is used directly in a constraint without independent validation. Attacker-prover can substitute any value.
- **Hint error path silently returns zero** — hint function catches an error and returns felt252(0) instead of failing, causing the proof to succeed with wrong data.
- **Hint-provided witness used as array index** — unbounded felt252 from hint used as index into a fixed-size array, causing out-of-bounds panic or wrapping.

## Arithmetic

- **felt252 arithmetic wrapping silently** — subtraction of larger from smaller felt252 wraps around the Stark prime, producing a large positive number instead of a negative error.
- **assert_range_u128 missing** — felt252 value assumed to fit in u128 without explicit range check, allowing values above 2^128 to pass through.
- **Division treated as integer division** — felt252 division computes modular inverse, not floor division; code assumes truncation semantics.

## Builtin

- **range_check skipped for "known" values** — developer assumes a felt252 is small because of prior arithmetic, but an attacker-prover can inject any value before the unchecked path.
- **Pedersen hash without domain separation** — two different data structures hash to the same Pedersen output because neither prefixes a type tag.
- **ec_op on unvalidated point** — point from calldata passed to ec_op without on-curve check, allowing invalid-curve attacks.

## Compiler and runtime

- **Inline CASM bypasses Sierra safety** — developer uses raw CASM hint to skip Sierra gas metering or type safety, opening resource exhaustion or type confusion.
- **Library dispatch via unchecked class hash** — contract calls library_call with a felt252 class hash from storage or calldata without validating it points to an expected contract class.
