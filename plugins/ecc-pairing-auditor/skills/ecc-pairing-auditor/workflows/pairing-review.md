# Pairing Review

Review pairing verification and aggregation paths as a single semantic unit.

## Phase 1: Equation correctness

- Confirm the pairing equation direction matches the protocol specification
- Check G1/G2 assignments and sign conventions across the entire verification path
- Verify final exponentiation is applied before a GT result is interpreted

## Phase 2: Rogue-key and DST controls

- Check rogue key defenses such as proof of possession or message augmentation
- Review `hash_to_curve` DST values for uniqueness across protocol, suite, and version

## Phase 3: Batching and optimization

- Verify batch randomness is independent of attacker control
- Check multi-Miller loop batching against the reference semantics
- Verify aggregation is commutative and insensitive to signer order

Optimized pairing code is not automatically equivalent to the reference path.
Treat every fast path as a semantic fork until proven otherwise.
