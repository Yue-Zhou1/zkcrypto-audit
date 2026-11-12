# fhe-auditor Finding Patterns

## P1: Noise budget exhausted before claimed depth

- **Pattern:** the deepest evaluation path, counted with rotations and key
  switches and worst-case plaintexts, exceeds the decryption bound.
- **Impact:** wrong results; if failures are observable, also P7.

## P2: Modulus switch drops precision silently

- **Pattern:** a modulus switch or rescale runs at the wrong level or
  scale, or operands with different scales are combined, with no error.
- **Impact:** the correctness margin shrinks or the result is garbage
  while the pipeline reports success.

## P3: Bootstrapping refresh misses a secret-dependent term

- **Pattern:** the refresh omits a key-dependent component or correction
  step, or is called on a message outside its input range.
- **Impact:** the refreshed ciphertext decrypts to a different message.

## P4: Plaintext slots leak through debug or log paths

- **Pattern:** diagnostics print decoded slots, plaintext operands, or
  noise measurements; unmasked slots carry other values to the recipient.
- **Impact:** disclosure with no cryptographic break.

## P5: Key-switch material mismatch accepted

- **Pattern:** a relinearization, rotation, or bootstrapping key with the
  wrong dimension, modulus, decomposition, or key identity is applied.
- **Impact:** silent corruption; a key targeting another party's secret
  re-encrypts the user's data to that party.

## P6: CKKS decryption result released

- **Pattern:** an approximate decryption reaches a party who knows the
  ciphertext, with no flooding or a flooding bound the adversary shapes.
- **Impact:** secret-key recovery by linear algebra (Li-Micciancio).

## P7: Exact scheme with observable failures

- **Pattern:** a correctness-level failure probability or a heuristic
  noise estimate, in a deployment where decryption results are shared.
- **Impact:** IND-CPA-D key recovery, as published against exact schemes
  in 2024.

## P8: Security estimated for the wrong instance

- **Pattern:** the estimate ignores special primes, assumes a dense secret
  where the code samples a sparse one, or covers one of two instances.
- **Impact:** real security below the claim.

## P9: Malformed or adversarial ciphertext reaches the decryptor

- **Pattern:** ciphertexts from untrusted parties are evaluated or
  decrypted without structural validation, and the outcome is visible.
- **Impact:** reaction attack and key recovery; memory-safety faults.

## P10: Threshold share without adequate smudging

- **Pattern:** partial decryptions carry no smudging noise, too little for
  the query count, or reused noise; or shares are issued for any ciphertext.
- **Impact:** key-share leakage, or a decryption oracle for a coalition.

## P11: Result ciphertext reveals more than the result

- **Pattern:** evaluated ciphertexts return unsanitized where the circuit
  or evaluator inputs are meant to be hidden, or a transparent or trivial
  (key-independent) ciphertext leaves the evaluator.
- **Impact:** the key holder learns about the circuit from noise; a
  transparent ciphertext is readable by anyone.
