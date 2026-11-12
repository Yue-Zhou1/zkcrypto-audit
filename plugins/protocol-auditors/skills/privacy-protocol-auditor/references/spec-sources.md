# privacy-protocol-auditor Spec Sources

## Normative

- Zcash Protocol Specification (Hopwood, Bowe, Hornby, Wilcox; version
  2024.5.1 or the version the target claims) — the reference formalization
  of note commitments, nullifier derivation (rho/nk PRFs, §4.16
  "Computing ρ values and Nullifiers", titled "Note Commitments and
  Nullifiers" before version 2023.4.0), value commitments and the binding
  signature, and spend authority. Normative for what a sound shielded pool
  must bind.
- Sapling/Orchard sections of the Zcash spec — per-note nullifier
  uniqueness. Sapling: ρ = MixingPedersenHash(cm, position) and
  nf = PRF^nfSapling_nk(ρ). Orchard is not position-based: ρ of a new note
  is the nullifier of the note spent in the same Action, and nf is derived
  from nk, ρ, ψ, and cm. The "Faerie Gold attack and fix" section gives the
  rationale. Used for the P3 checks.
- Tornado Cash — whitepaper ("Tornado Cash Privacy Solution version 1.4")
  and the audited tornado-core contracts. Normative-by-adoption for
  fixed-denomination mixers: recipient/fee/relayer as public inputs bound
  in the proof statement, and the root-history window design.
- EIP-155 (chain ID) — the replay-domain primitive protocol statements must
  incorporate for cross-fork safety.

## Informative

- Semaphore (Semaphore protocol documentation, PSE) — external nullifier /
  scope design as the canonical domain-separation pattern for nullifiers.
- 0xPARC zk-bug-tracker entries on nullifier handling — "a16z ZkDrops:
  Missing Nullifier Range Check" and "EY Nightfall: Missing Nullifier Range
  Check" (a uint256 nullifier not range-checked against the field order,
  allowing a second claim or spend; P1), and "Aztec 2.0: Missing Bit Length
  Check / Nondeterministic Nullifier" (one note yielding several
  nullifiers).
- Aztec Connect Join-Split circuit specification and Railgun
  documentation — deployed join-split note designs (Aztec Connect: two
  input and two output notes with an in-circuit value-conservation check);
  reference points for the P8 and P9 checks.
