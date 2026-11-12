# share-validation-review.md

Executable review workflow for share integrity, the offline/online boundary,
and session-bound execution in secret-sharing MPC.

1. **Pin the protocol and model.** Name the sharing scheme (additive,
   Shamir, replicated, SPDZ-family), its paper, and the claimed adversary
   model, threshold, and output guarantee. If the code claims a named
   protocol, queue `spec-delta-checker`.

2. **Enumerate phases per role.** Map setup, offline, and online stages for
   each participant role. Record the artifacts each stage produces (shares,
   triples, transcripts) and every offline-to-online transition point.

3. **Build the share ledger.**
   `grep -rn "share\|mac\|triple\|open\|reconstruct\|reveal\|combine"`.
   One row per share: where it is received or generated, parsed,
   authenticated, and consumed, traced through to reconstruction.

4. **Order the checks.** For each row, confirm the MAC/commitment check
   executes before any consumption on every path, including error paths
   (P1), and that threshold and participant-set checks gate reconstruction.

5. **Test parsing.** At each parse site decide what happens to a value at or
   above the modulus or of the wrong length (P10), and whether a rejected
   share leaves accumulators and counters untouched.

6. **Walk the MAC check.** For SPDZ-style code, show every opened value
   enters the check and find when its coefficients are fixed. Locate the
   first point any output or branch decision is revealed and confirm the
   check has already passed (P8).

7. **Follow one triple.** From generation to use: how correctness is
   checked, how it is authenticated, where the consumption index lives, and
   what a crash or retry does to it (P3, P9). For imported preprocessing,
   name the producer and whether the trust model includes them.

8. **Check session and role binding.** For each message handler record
   which of sender identity, role, session identifier, and round it checks.
   Verify identifiers are unique per round. Replay, on paper, one message
   from an earlier round and one from a parallel session: both must be
   rejected deterministically (P2, P5).

9. **Check broadcast and abort.** For each value treated as broadcast, find
   the consistency mechanism (P11). For each abort site, list what has
   been revealed and what a retry would reuse.

10. **Hand off.** Compare candidates against `references/finding-patterns.md`,
    fill the output contract, and forward survivors to `crypto-fp-check`.
    Verified findings continue from there to `crypto-report-writer`.

## Failure rules

- A share row closes only when the check dominates every consumer.
- Under a semi-honest claim, do not file each missing malicious-model check.
  File one candidate if the deployed parties do not fit the model.
- If the governing paper cannot be identified, mark candidates that depend
  on protocol details `unverified`.
- Stop tracing a value once it is authenticated and all its consumers
  follow the check; do not re-audit the field arithmetic library here.
