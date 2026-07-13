# fault-injection-auditor Finding Patterns

## F1: Unprotected RSA-CRT (Bellcore)

- **Pattern:** CRT signing without verify-after-sign or redundant
  recombination.
- **Impact:** one fault in Sp or Sq during signing produces s' where
  gcd(s'^e - m mod N, N) reveals a prime factor of N — full key recovery
  from a single faulty signature.

## F2: Differential fault analysis on deterministic signatures

- **Pattern:** deterministic ECDSA/EdDSA (or deterministic ML-DSA/SLH-DSA)
  with no redundancy or re-verification, in a fault-exposed deployment.
- **Impact:** a correct and a faulted signature over the same message
  yield equations that recover the private key.

## F3: Single-branch verification skip

- **Pattern:** `if (!valid) return REJECT;` as the sole gate; an
  instruction-skip glitch skips the branch and the accept path proceeds.
- **Impact:** signature/MAC/secure-boot bypass with one well-timed glitch;
  the classic smartcard PIN-verify and firmware-signature bypass.

## F4: Bit-flip on the verification result

- **Pattern:** boolean verdict stored in a single byte/register and
  compared once; a data-fault flips 0->nonzero.
- **Impact:** reject becomes accept without touching the crypto at all.

## F5: Fault-attackable countermeasure

- **Pattern:** a verify-after-sign or redundancy check that is itself a
  single branch or a same-path recomputation.
- **Impact:** a second fault (or one fault hitting the check) defeats the
  countermeasure — protection that isn't.

## F6: Loop-shortening faults

- **Pattern:** exponentiation ladders or rejection-sampling loops whose
  counter can be glitched to exit early.
- **Impact:** weakened exponentiation (leaking key bits) or biased
  sampling; can reduce a scalar-mult to a guessable partial result.

## F7: Fault-oracle error handling

- **Pattern:** detected-fault handler returns a distinguishable error,
  leaks an intermediate, or allows unlimited retries.
- **Impact:** repeated faulting turns the detector into an oracle,
  recovering secrets incrementally.

## Disposition note

State the fault model, attacker access, repeatability, and evidence basis.
An instruction-skip or corruption simulation can validate the software path,
but does not by itself establish physical exploitability; use
`unverified`/`residual_risk` when the deployment model is unproven. Passive
leakage observed along the way routes to `side-channel-auditor`.
