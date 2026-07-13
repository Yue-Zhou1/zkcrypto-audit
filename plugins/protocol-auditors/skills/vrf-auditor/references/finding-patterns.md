# vrf-auditor Finding Patterns

## P1: Output consumed before verification

- **Pattern:** consumer calls proof_to_hash (or reads beta from the
  prover's message) and uses the output, verifying later or never.
- **Impact:** the "VRF" degrades to attacker-chosen randomness; leader
  election/lottery fully biasable.

## P2: Missing key validation for adversarial-key deployments

- **Pattern:** ECVRF verifier skips validate_key while the protocol lets
  participants register arbitrary public keys.
- **Impact:** loss of full uniqueness/collision resistance — a malicious
  participant crafts keys where one input maps to multiple valid outputs
  and picks the favorable one.

## P3: Cofactor mishandling in proof_to_hash

- **Pattern:** beta = Hash(suite || 0x03 || Gamma) without cofactor
  multiplication on cofactor-8 curves.
- **Impact:** small-order components make verified Gamma variants hash to
  different betas — output ambiguity that breaks uniqueness.

## P4: Domain-separation drift

- **Pattern:** wrong suite string, missing separation octets, homemade
  DSTs in encode_to_curve, or the VRF hash reused for other protocol
  hashing.
- **Impact:** cross-protocol collisions and non-interoperable outputs;
  in the worst case, challenge forgery across contexts.

## P5: Nonce reuse or RNG substitution in proving

- **Pattern:** random k instead of §5.4.2 derivation, k cached across
  inputs, or fork/snapshot duplication of prover state.
- **Impact:** secret key recovery from two proofs (same algebra as
  Schnorr nonce reuse).

## P6: Malformed-proof tolerance

- **Pattern:** decode_proof accepts out-of-range c or s, non-canonical
  Gamma encodings, or skips the U/V recomputation ("optimized" verify).
- **Impact:** forged proofs verify; combined with P1-style consumers, the
  output is attacker-controlled.

## P7: Application-level grinding

- **Pattern:** participants can (a) register new keys after the epoch
  seed is known, (b) influence alpha after seeing others' outputs, or
  (c) withhold unfavorable outputs without penalty.
- **Impact:** selection bias without breaking any cryptography — the
  Algorand/Ouroboros-class caveat; usually `observation`/`residual_risk`
  with quantified bias.

## P8: RSA-FDH-VRF representative mismatch

- **Pattern:** wrong MGF1 input/length or suite octets, accepting a proof
  representative outside the RSA modulus, or not comparing `RSAVP1(pi)` to
  the exact RFC-derived MGF1 representative.
- **Impact:** invalid proofs can be accepted or outputs become
  non-interoperable. RSA-FDH-VRF does not use PKCS#1 v1.5/RSASSA padding, so
  PKCS#1 parser-tolerance findings do not apply.
