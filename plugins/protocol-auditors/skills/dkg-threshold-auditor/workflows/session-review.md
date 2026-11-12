# session-review.md

Executable review workflow for DKG and threshold-signing sessions. Review
them as state machines, not isolated functions.

1. **Pin the protocols.** Key generation (trusted dealer or a named DKG),
   signing (FROST ciphersuite, MuSig2, threshold BLS), and any refresh,
   each with its governing document. RFC 9591 does not specify a DKG.

2. **Draw the state machine per role.**
   `grep -rn "round\|commit\|nonce\|share\|session\|identifier\|aggregate"`
   Per round: messages in and out, checks, state stored and erased, and the
   participant and session identifiers checked at each boundary (P2).

3. **Trace identifiers.** From each entry point (wire, config) to where the
   value is reduced and checked. Try 0, q, q+1, and a duplicate: zero or
   duplicate identifiers must be rejected before any interpolation (P6).

4. **Rewrite the share check.** Set the code's equation beside the
   scheme's. Verify the group, field, and exponent indexing, the commitment
   vector length (P7), that each participant checks every share against the
   public polynomial commitments, and that all hold the same ones (P3).

5. **Play the adversarial dealer.** As the last to commit: can the constant
   term depend on others' commitments, and does a key aggregation defense
   prevent rogue-key cancellation (P4, P8)? As a complainer: can an honest
   dealer be disqualified without evidence (P9)?

6. **Tabulate nonce lifetime.** One row per secret nonce: generation
   inputs, where stored, used, and erased. Replay on paper: round two
   requested twice with a different message or commitment list; a crash
   between use and erase; a retry after abort. A repeated nonce is P1.

7. **Write out the binding.** List the inputs of the binding factor or
   nonce coefficient and of the challenge. Verify the nonce derivation
   binds the message, aggregate public key, and fresh randomness, plus the
   commitment list and signer identifier for FROST (P5).

8. **Check concurrency.** Open several DKG and signing sessions at once and
   list what they share: nonces, shares, caches, mutable global state.

9. **Review reconstruction, aggregation, and refresh.** Lagrange inputs
   and the denominator check, the signer set used for coefficients, that
   exactly the intended quorum is accepted, and final verification. For
   refresh: zero constant term, key unchanged, epoch handling (P10).

10. **Walk every abort.** For each exit before completion, list what was
    revealed, what stays in memory or on disk, and what a retry reuses.

11. **Hand off.** Fill the output contract per candidate, including
    `session_scope`, and forward survivors to `crypto-fp-check`.

## Failure rules

- Abort handling is part of the security model. A safe happy path does not
  rescue an unsafe multi-session implementation; steps 6, 8, and 10 close
  separately from steps 4 and 7.
- Nonce reuse needs the concrete call sequence that reaches the same nonce
  twice; a missing erase with no reachable second use is an `observation`.
- Key bias is an `observation` unless the application needs a uniform key.
