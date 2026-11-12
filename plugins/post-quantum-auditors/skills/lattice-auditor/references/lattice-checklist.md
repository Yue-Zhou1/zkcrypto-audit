# lattice-auditor Checklist

## Parameter provenance and security estimate

- [ ] The LWE/RLWE/MLWE/SIS/NTRU parameter set maps to a documented scheme
      and security claim: dimension, rank, modulus, secret and error
      distributions, samples published per secret.
- [ ] Modulus and dimension constants are consistent across code paths:
      key generation, use, serialization, and tests share one definition.
- [ ] Security-level claims account for implementation-specific shortcuts:
      sparse or fixed-weight secrets, narrowed error, truncated seeds.
- [ ] The estimate is reproducible from the code's constants, with tool
      version, cost model, and attacks considered (primal, dual, hybrid).
- [ ] Narrow-error or many-sample instances are checked against algebraic
      and combinatorial attacks, which lattice-reduction estimates omit.
- [ ] NTRU-type moduli are small enough relative to the dimension to stay
      out of the overstretched regime.

## Secret and error distributions

- [ ] The noise sampling distribution matches the intended specification:
      support, exact probabilities, centring.
- [ ] CBD samplers use the specified number of fresh bits per coefficient
      with no overlapping or skipped bits.
- [ ] Discrete Gaussian tables have the precision and tail cut the stated
      bound requires; no platform-dependent float decides a sample.
- [ ] Uniform sampling modulo q uses rejection or a wide enough reduction,
      not `% q` on a narrow value.
- [ ] Rejection sampling enforces unbiased acceptance criteria: the
      specification's condition and constants, and a rejected candidate is
      discarded whole.
- [ ] Sampling loops do not leak secret-dependent timing or acceptance
      patterns beyond what the scheme's proof allows.
- [ ] Preimage samplers output a distribution independent of the secret
      basis; plain rounding against the basis is not used.

## Seed and domain separation

- [ ] Seed derivations use domain-separated contexts per role: public
      matrix, secret, error, per-operation randomness.
- [ ] Public and secret derivation paths never reuse identical seed
      contexts, and no two secret outputs share a (seed, nonce) pair.
- [ ] Deterministic derivation includes collision-resistant transcript
      inputs: full message, public key, and context, unambiguously encoded.

## Modulus arithmetic and NTT

- [ ] The modulus supports the transform: a full negacyclic NTT of size n
      needs q = 1 mod 2n; otherwise the incomplete transform and matching
      base multiplication are implemented.
- [ ] Root tables come from a primitive root of the right order, in the
      ordering the butterflies expect; inverse scaling is applied once.
- [ ] Montgomery and Barrett reductions get inputs inside their proven
      range; lazy-reduction chains state a bound that fits the type.
- [ ] Products match schoolbook negacyclic multiplication on boundary
      inputs, not only in round-trip tests.
- [ ] NTT/coefficient and Montgomery/normal domains are tracked across API
      boundaries; norms use centred representatives without overflow.

## Decryption failure bounds

- [ ] Decryption-failure probability assumptions are explicit and
      validated: the noise expression, rounding error included, is
      recomputed with the code's distributions.
- [ ] Rounding and compression behavior matches the proven bounds: bit
      widths, rounding direction, tie-breaking.
- [ ] Failure handling cannot be exploited as an oracle through return
      values, errors, retries, protocol aborts, or timing.

## Key validation, decapsulation, and decoding

- [ ] Parsing and normalization preserve canonical field and ring
      representations: out-of-range coefficients are rejected, not reduced.
- [ ] Peer keys and ciphertexts are checked for dimension and for
      degenerate values the scheme excludes.
- [ ] Verification enforces every norm bound on every response component,
      and the bound is below the modulus and the one the estimate used.
- [ ] Encapsulation and decapsulation checks reject malformed ciphertexts
      deterministically.
- [ ] Decapsulation reject behavior is constant-time where required:
      comparison and key selection have no secret-dependent branch.

## Reuse and reaction attacks

- [ ] The key lifetime is identified from code (ephemeral, cached, static);
      a passively secure scheme answers one peer message per key.
- [ ] Static-key use goes through a re-encryption check, and the failure
      probability is negligible against the ciphertexts an attacker submits.
- [ ] Post-decryption behavior (key confirmation, MAC failure,
      retransmission) does not reveal per-ciphertext success to the sender.
