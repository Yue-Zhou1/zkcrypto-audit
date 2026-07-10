# mta-review.md

Executable review workflow for the Paillier/MtA core of a threshold ECDSA
implementation.

1. **Pin the construction.** Identify GG18 / GG20 / CGGMP21 / Lindell and
   the exact paper revision the code claims. Record it — every later step
   verifies against that revision, and route the claim itself to
   `spec-delta-checker` if the code names a paper.

2. **Locate the proof inventory.**
   `grep -rn "range_proof\|RangeProof\|mta\|MtA\|paillier\|Pi_mod\|Pi_fac\|prm"`
   and build a table: proof name -> where generated -> where VERIFIED.
   Any row with an empty "verified" cell is a P1/P2 candidate.

3. **Check Paillier modulus validity.** For each counterparty key
   acceptance path, confirm square-free + no-small-factor proofs are
   checked (CGGMP21 Π^mod/Π^fac or the GG revision's equivalent), and that
   N meets the size bound the range proofs assume (N > q^7 for standard
   parameters).

4. **Trace one full MtA exchange.** For a = k_i, b = gamma_j (and the MtAwc
   variant with w_j): confirm the initiator range proof, responder range
   proof, Beta' sampling interval, and ciphertext homomorphism reductions.
   Write down the algebra with the actual variable names from the code and
   check the mod N -> mod q conversion accounting.

5. **Check verification failure handling.** A failed proof must abort the
   session and (for identifiable-abort protocols) blame without revealing
   fresh secrets. Confirm failures are not downgraded to warnings/logs.

6. **Check presignature and session lifecycle.** Single-use consumption
   before release, session-ID binding on every round message, independent
   state per concurrent session, verify-before-release of the final
   signature.

7. **Check resharing.** Epoch monotonicity, old-committee authorization,
   share zeroization after rotation.

8. **Produce the output contract.** For each candidate fill
   `protocol_round`, `proof_or_range_check`, `invariant_at_risk`,
   `evidence` (code path plus the algebraic consequence; Critical/High
   candidates need a PoC sketch of the extraction), `disposition`, and
   `next_route` (`crypto-fp-check`; cross-route to `mpc-auditor`,
   `randomness-auditor`, or `side-channel-auditor` as applicable).
