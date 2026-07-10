# privacy-protocol-auditor Spec Sources

## Normative

- Zcash Protocol Specification (Hopwood, Bowe, Hornby, Wilcox; version
  2024.5.1 or the version the target claims) — the reference formalization
  of note commitments, nullifier derivation (rho/nk PRFs, §4.16
  "Note Commitments and Nullifiers"), value commitments and the binding
  signature, and spend authority. Normative for what a sound shielded pool
  must bind.
- Sapling/Orchard sections of the Zcash spec — position-based nullifier
  uniqueness (Orchard nf = derived from rho = note position mixing),
  used for the P3 checks.
- Tornado Cash — whitepaper ("Tornado Cash Privacy Solution version 1.4")
  and the audited tornado-core contracts. Normative-by-adoption for
  fixed-denomination mixers: recipient/fee/relayer as public inputs bound
  in the proof statement, and the root-history window design.
- EIP-155 (chain ID) — the replay-domain primitive protocol statements must
  incorporate for cross-fork safety.

## Informative

- Semaphore (Semaphore protocol documentation, PSE) — external nullifier /
  scope design as the canonical domain-separation pattern for nullifiers.
- ZKPs and "double-spend via non-canonical field encoding" advisories
  (e.g., the 2019 Zcash counterfeiting vulnerability postmortem and
  circom-pool aliasing writeups) — motivate P1/P8.
- Railgun, Aztec architecture docs — join-split value conservation across
  multiple proofs per transaction (P8) and change-output linkage handling
  (P9).
