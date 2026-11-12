# noise-budget-review.md

Executable review workflow for FHE noise accounting, transform correctness,
and decryption exposure.

1. **Pin the instance.** Record scheme, library version, and every
   parameter from code or a serialized context
   (`grep -rn "poly_modulus_degree\|coeff_modulus\|LogQ\|LogP\|lwe_dimension\|glwe_dimension"`).
   Parameters negotiated at run time are attack surface: review the
   weakest set a peer can select.

2. **Re-check security** against the largest modulus any key material is
   published under and the secret distribution the sampler produces. A
   custom set, a sparse secret, or disabled enforcement requires a fresh
   estimate; route methodology to `lattice-auditor`.

3. **Build the lifecycle table.** One row per transform from encryption to
   the final decrypt or consume step: operation, level and scale in and
   out, key material used, noise term, who controls each operand. Mark
   modulus transitions, key switches, and expected bootstrapping points.

4. **Derive the deepest path.** Trace the documented noise formulas against
   implementation constants and recompute consumption for the path with
   the most multiplications, rotations included. Record margin, failure
   probability, and whether the bound is worst-case or heuristic. With a
   secret-key test harness, measure the remaining budget on that path with
   extreme plaintexts. Flag paths that exceed the claimed depth (P1).

5. **Break the bookkeeping.** For each binary operation, modulus switch,
   and rescale, construct operands at different levels or scales; the code
   must align or reject them (P2).

6. **Review bootstrapping.** Check parameter sets and refresh equations
   against the scheme paper, the input precondition at each call site, and
   what the caller does when bootstrapping fails (P3).

7. **Trace evaluation keys.** For each relinearization, rotation,
   key-switching, and bootstrapping key: generator, binding to key
   identifier and parameter set, checks on load. Construct one with a wrong
   dimension or modulus and one from another secret key; both must be
   rejected (P5).

8. **Enumerate decryption sinks:** every place a decrypted value, error,
   or retry becomes visible, and to whom. A CKKS result visible to a
   ciphertext holder needs flooding (P6); an exact scheme needs a
   negligible failure probability (P7); a decryptor taking unverified
   ciphertexts needs validation and an indistinguishable failure path
   (P9). Review threshold shares the same way (P10).

9. **Check leakage boundaries.** Plaintext in logs, debug hooks, and error
   surfaces (P4); slot masking; sanitization and transparent ciphertexts
   (P11). Then fill the output contract per candidate, with `next_route`
   set to `crypto-fp-check` plus any cross-route.

## Failure rules

- A noise or depth claim with neither a derivation nor a measurement on
  the deployed parameters is `unverified`.
- A security level with no estimate against the full modulus and actual
  secret distribution is `unverified`.
- Decryption exposure is never "not applicable" before step 8's list is
  complete. A budget measured on random inputs does not close P1.
