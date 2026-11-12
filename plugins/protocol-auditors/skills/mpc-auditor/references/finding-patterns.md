# mpc-auditor Finding Patterns

## P1: Unchecked share accepted into reconstruction

- **Pattern:** reconstruction or opening proceeds without verifying the
  share's MAC or commitment, or verifies it on only some code paths.
- **Impact:** one party shifts the reconstructed value by a chosen offset.

## P2: OT sender/receiver role confusion

- **Pattern:** the implementation swaps or weakens sender/receiver
  assumptions, or takes the role from a peer message instead of the session.
- **Impact:** input substitution, or one party obtaining both messages.

## P3: Beaver triple not authenticated

- **Pattern:** online multiplication consumes unverified preprocessing: no
  MAC, no sacrifice or bucket check, or an unauthenticated source.
- **Impact:** products are wrong by an attacker-known error, which breaks
  correctness and can leak inputs through the erroneous output.

## P4: Garbled-table label reuse

- **Pattern:** labels, the free-XOR offset, or a whole garbled circuit are
  reused across evaluations, or label generation allows collisions.
- **Impact:** two labels on one wire reveal the offset under free-XOR, and
  with it every wire value.

## P5: Session transcript reused across rounds

- **Pattern:** stale transcript or hash state leaks into new protocol
  rounds, or messages carry no session or round identifier.
- **Impact:** replay of earlier messages, cross-session substitution, and
  challenges that do not depend on the current instance.

## P6: Selective-failure leak

- **Pattern:** the evaluator aborts, errors differently, or takes longer
  when a specific garbled row, label, or OT message is malformed.
- **Impact:** a malicious garbler learns a predicate of the evaluator's
  input from whether the run completed.

## P7: Semi-honest component under a malicious claim

- **Pattern:** a protocol documented as malicious-secure uses OT extension
  without its consistency check, plain Yao with no garbler-correctness
  mechanism, or triples with no correctness check.
- **Impact:** the claimed guarantee does not hold; depending on the
  component, the honest party's secrets are recoverable.

## P8: Output released before the MAC check

- **Pattern:** outputs, comparison results, or control-flow decisions are
  revealed before the batched MAC check passes, or the check omits values.
- **Impact:** the adversary learns a function of honest inputs computed on
  tampered openings.

## P9: Preprocessing reuse

- **Pattern:** a triple or mask is consumed twice: counter reset on
  restart, shared pool across sessions, or retry after abort.
- **Impact:** the two openings reveal the difference of two secret inputs.

## P10: Non-canonical or out-of-range share

- **Pattern:** values at or above the modulus are reduced on parse, or
  inputs assumed to be bits or bounded are never constrained.
- **Impact:** the same value passes checks under two encodings, or a party
  injects an input outside the function's domain and corrupts the result.

## P11: Equivocation without broadcast

- **Pattern:** a round the protocol models as broadcast is sent
  point-to-point with no echo or hash comparison.
- **Impact:** honest parties continue with different views of the round.
