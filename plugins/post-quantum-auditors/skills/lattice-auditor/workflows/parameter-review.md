# parameter-review.md

Executable review workflow for lattice parameters, samplers, arithmetic,
and failure paths.

1. **Classify and route.** Name the assumption and the role (encryption,
   KEM, signature, commitment, proof). ML-KEM, ML-DSA, Falcon, and FHE
   schemes go to `pqc-kem-auditor`, `pqc-signature-auditor`, or
   `fhe-auditor`; continue here only for a shared custom layer.

2. **Extract the instance from code.** Inventory every parameter constant
   (`grep -rn "modulus\|ETA\|SIGMA\|GAMMA\|BETA\|sample_\|cbd\|gauss\|reject"`):
   dimension, rank, modulus, each distribution, compression widths, norm
   bounds, samples per secret. Map them to the claimed scheme, version,
   and security level; flag undocumented or custom deviations.

3. **Reproduce the security estimate** with those constants, for example
   with the lattice estimator, passing the dimension, modulus, secret and
   error distributions, and sample count the code uses. Model a sparse or
   fixed-weight secret as such. Record tool version and cost model.

4. **Recompute the failure probability.** Write the decryption noise
   expression as implemented, compression error included, and evaluate it
   for the code's distributions. Compare with the claim.

5. **Trace each sampler from entropy source to output:** bytes consumed,
   bit extraction, mapping, acceptance criteria, loop bounds. Enumerate
   small domains exhaustively against the exact distribution; recompute
   Gaussian table entries.

6. **Tabulate seeds.** One row per derived value: seed, domain or nonce,
   output, public or secret. A repeated (seed, nonce) among secret rows,
   or a seed in both public and secret rows, is P3.

7. **Test the arithmetic.** Compare multiplication with a schoolbook
   negacyclic product on all-maximal, single-monomial, and random inputs;
   check each reduction call against its input range (P8).

8. **Review decryption and decapsulation.** Trace failure conditions and
   reject handling, comparisons and failure responses for constant-time
   behavior, canonical parsing, and rounding against the documented
   parameters. Determine the key lifetime from code and whether a
   re-encryption check protects a reused key (P5, P9, P10).

9. **Check verification bounds** on every response component (P11), then
   fill the output contract per candidate, with `next_route` set to
   `crypto-fp-check` plus any cross-route.

## Failure rules

- A security level that cannot be reproduced from the code's constants is
  `unverified`; never copy the paper's number.
- A sampler with an enumerable domain is not accepted on a histogram.
- Round-trip NTT tests do not close step 7.
- If any code path reuses a key, review it as static.
- Sampler and reject-path timing is routed to `side-channel-auditor`, not
  settled by reading source.
