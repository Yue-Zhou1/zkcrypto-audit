# Commitment Scheme Finding Patterns

- **Degree bound check missing on committed polynomial** — prover can commit to higher-degree polynomial than verifier model assumes.
- **evaluation point reuse across independent proofs** — reused challenges weaken binding and can enable cross-proof manipulation.
- **SRS loaded from untrusted source without validation** — verifier trusts setup material without integrity guarantees.
- **Batch opening challenge derived before all commitments absorbed** — challenge is not bound to full statement set.
- **FRI folding factor inconsistent with claimed security level** — proof parameters undercut expected soundness margin.
- **IPA generators not provably independent** — hidden relations weaken binding assumptions.
