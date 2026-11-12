---
name: fhe-auditor
description: >
  Audit fully homomorphic encryption code (BFV, BGV, CKKS, TFHE) for
  noise-budget accounting, modulus and key switching, relinearization,
  bootstrapping correctness, parameter security, decryption-result exposure
  (IND-CPA-D), circuit privacy, threshold decryption shares, evaluation-key
  provenance, and validation of untrusted ciphertexts. Use when reviewing an
  FHE library, a service that evaluates on encrypted data, or any path that
  decrypts or releases homomorphic results.
allowed-tools: Read Grep Glob Bash
---

# fhe-auditor

Domain auditor for homomorphic encryption pipelines: every transform a
ciphertext passes through from encryption to the point where a decrypted
value, or the fact that decryption succeeded, becomes visible.

**Core principle:** IND-CPA covers ciphertexts only. Once a decrypted value
or a decryption failure is observable, the noise is an output too.

## When to Use

- Auditing a BFV, BGV, CKKS, or TFHE-family library or a service built on it
- Reviewing noise growth calculations, claimed depth limits, modulus and
  key switching, relinearization, bootstrapping, and plaintext/ciphertext
  boundary handling
- Decrypted results or failure signals reach anyone but the key holder
  (CKKS approximate decryption, threshold decryption, decryption services)
- Ciphertexts, evaluation keys, or decryption shares come from untrusted
  parties, or the design claims circuit privacy

## When NOT to Use

- Generic LWE/RLWE parameter estimation and sampler correctness outside the
  FHE lifecycle -> `lattice-auditor`
- Non-homomorphic or hybrid encryption -> `encryption-scheme-auditor`
- Threshold key generation and share verification -> `dkg-threshold-auditor`
- The MPC protocol around threshold decryption -> `mpc-auditor`
- Proofs of correct encryption or decryption -> `zk-circuit-auditor`
- Timing and cache leakage in NTT or sampling -> `side-channel-auditor`
- RNG lifecycle for encryption and flooding noise -> `randomness-auditor`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The scheme is IND-CPA secure, so returning decrypted results is safe" | IND-CPA gives the adversary no decryptions. A CKKS result together with its ciphertext yields linear equations in the secret key; exact schemes leak through decryption failures when the failure probability is not negligible |
| "The noise budget was positive in every test" | Tests sample typical inputs. The claim is a tail bound over encryption randomness for the deepest path and worst-case plaintexts, and an adversary who picks inputs or circuits aims for the tail |
| "The parameters come from the standard table" | The tables fix a secret distribution and bound the total modulus. Sparse secrets, special key-switching primes, and bootstrapping parameter sets are outside what the table row certifies |
| "Evaluation keys are public, so they need no checks" | Public is not authentic. A key-switching key from the user's key to another key is a re-encryption capability, and a mismatched key silently corrupts every result |
| "The server never holds the secret key, so nothing it logs is sensitive" | Plaintext operands, transparent or trivial ciphertexts, and the evaluator's own inputs are all readable without the key; result noise also carries information about the circuit |
| "Ciphertexts are malleable by design, so validating them is pointless" | Malleability inside the scheme is intended. A ciphertext with the wrong level, scale, degree, or coefficient range is outside it, and a decryptor that reacts to such inputs is a key-recovery oracle |

## Core Review Areas

1. Scheme and parameter identification; security estimate for the full
   modulus and the secret distribution actually used
2. Ciphertext modulus transitions and switching semantics (level, scale)
3. Noise growth tracking and budget accounting against the claimed depth
4. Relinearization and key-switch application correctness
5. Bootstrapping parameter validity and correctness
6. Decryption exposure: CKKS results, observable failures, reaction attacks
7. Plaintext/ciphertext boundary, slot-packing isolation, circuit privacy
8. Threshold and multi-key decryption shares: smudging noise and binding
9. Key-switch material provenance and validation of untrusted inputs

## Workflow

### Phase 1: Scheme and lifecycle mapping

- Read `references/fhe-checklist.md`
- Pin the scheme, library version, and parameters; map each ciphertext
  transform from encryption to the final decrypt or consume step

### Phase 2: Noise and transform review

- Execute `workflows/noise-budget-review.md`: per-stage noise budget,
  bootstrapping refresh, modulus and key-switch correctness, decryption sinks

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize exhausted noise budgets, precision drops, leakage boundaries,
  released decryptions, and unvalidated evaluation keys

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route estimation methodology to `lattice-auditor`, flooding
  randomness to `randomness-auditor`, threshold key generation to
  `dkg-threshold-auditor`, scheme-paper deltas to `spec-delta-checker`

## Output Contract

Produce an FHE handoff listing each candidate with:

- `scheme_and_parameter_set`
- `lifecycle_stage_and_transform`
- `issue_class` (`noise`, `bootstrapping`, `modulus_switch`, `key_switch`,
  `decryption_exposure`, `leakage`, or `input_validation`)
- `noise_or_exposure_invariant` (the budget or exposure rule at risk)
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/fhe-checklist.md](references/fhe-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/noise-budget-review.md](workflows/noise-budget-review.md)
