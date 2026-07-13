# fault-injection-auditor Checklist

## Fault model (state it first)

- [ ] The assumed attacker capability is written down: single vs multiple
      faults per execution, instruction-skip vs data-corruption, spatial/
      temporal precision, and physical access level. Every finding below
      is scoped to this model — an unstated model makes findings
      unfalsifiable.
- [ ] The deployment actually exposes this surface (HSM/smartcard/embedded
      device, shared host with rowhammer, adversarial cloud co-tenancy)?
      If not, findings are `observation` at most.

## RSA-CRT (Bellcore / Boneh-DeMillo-Lipton)

- [ ] The CRT signature is either verified against the public key before
      release (verify-after-sign, s^e ?= m) OR computed redundantly with a
      consistency check. A single fault in one half (Sp or Sq) otherwise
      yields a faulty signature s' with gcd(s'^e - m, N) = a factor of N.
- [ ] The Shamir/Giraud-style countermeasure, if used, is itself not
      bypassable by a second fault on the check.
- [ ] The check cannot be skipped by an instruction-skip glitch (the
      branch is not the only defense).

## Deterministic signatures (DFA)

- [ ] Deterministic ECDSA (RFC 6979) and EdDSA are flagged as DFA-exposed:
      because the nonce is fixed per message, a correct signature and a
      faulted signature over the SAME message can recover the key.
- [ ] Countermeasure present: redundant computation, re-verification, or
      re-introducing hedged randomness (RFC 6979 §3.6 / hedged EdDSA) where
      the environment is fault-exposed.
- [ ] SLH-DSA/ML-DSA deterministic modes carry the same flag (cross-route
      to `pqc-signature-auditor` for the scheme specifics).

## Verification-skip glitches

- [ ] Signature/MAC/proof verification does not rest on a single
      conditional branch that an instruction-skip can bypass; the accept
      path requires a positive, hard-to-forge condition (e.g., derived key
      material), not merely "did not take the reject branch".
- [ ] Boolean verification results are not stored/compared in a way where
      a single bit-flip flips accept/reject (use redundant/complementary
      encodings where the model warrants).
- [ ] Secure-boot / firmware-verification analogues follow the same rule.

## Redundant computation and detection

- [ ] Where redundancy is the countermeasure, it recomputes on
      independent data paths (not a memcpy of the same result), and the
      comparison is fault-hardened.
- [ ] Loop counters and bounds (exponentiation ladders, sampling loops)
      are protected against skip/early-exit faults that shorten the
      computation.
- [ ] Error handling after a detected fault fails safe (halt/zeroize),
      does not leak intermediate state, and cannot be turned into an
      oracle by repeated faulting.

## Verify-after-sign

- [ ] Signers re-verify their own output before releasing it wherever the
      fault model is credible; the re-verification uses independently
      loaded public-key material.

## Evidence and disposition honesty

- [ ] Findings state their evidence basis: source-level reasoning,
      simulated fault (instruction-skip emulation), or actual lab
      injection. Without hardware, Critical/High claims are downgraded to
      `residual_risk`/`observation` with the assumption made explicit —
      the executable-PoC gate is satisfied by a fault-simulation harness
      where physical injection is out of scope.
