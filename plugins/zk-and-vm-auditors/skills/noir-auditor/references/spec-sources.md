# noir-auditor Spec Sources

## Normative

- Noir language documentation for the pinned compiler version: unconstrained
  functions and `unsafe` blocks, oracles, data types (`Field`, integers,
  arrays, slices), casts, assertions, generics, and `comptime`. This is the
  reference for what a construct constrains; behavior has changed across
  releases, so read the version the target pins.
- Noir standard library documentation and source for the pinned version:
  black-box functions (hashes, signature verification, embedded-curve
  operations, recursive proof verification), bounded vectors, and field
  decomposition helpers. Governs the black-box and precondition checks.
- ACIR and Brillig documentation in the Noir repository (the `acvm` crates):
  which opcodes produce constraints and which are executed only during
  witness generation. Governs the boundary and Brillig/ACIR checks.
- Barretenberg documentation for the backend version in use: which proving
  scheme is selected, how public inputs are ordered, and how recursive
  verification artifacts (key, key hash, proof fields) are produced.
- The target protocol's own specification of the statement: which values are
  public and how they are encoded.

## Informative

- Aztec documentation and the aztec-nr libraries. A large body of Noir code
  with a consistent discipline for constraining oracle-returned notes and
  storage reads; note and nullifier semantics themselves belong to
  `privacy-protocol-auditor`.
- zksecurity/zkbugs corpus and curated vendor findings, reached through
  `zkbugs-index`. Noir coverage is thin; confirm an entry's source before
  citing it as prior art.
- Chaliasos et al., "SoK: What Don't We Know? Understanding Security
  Vulnerabilities in SNARKs" (USENIX Security 2024). Taxonomy in which
  under-constrained circuits are by far the dominant circuit-layer
  vulnerability, with wrong translation of logic into constraints, missing
  input constraints, and assigned-but-unconstrained values as the leading
  root causes; calibrates P1, P2, and P9.
- Public audit reports of Noir libraries and of the Noir compiler. Useful
  for compiler-version-specific issues; cite the specific report when a
  candidate depends on one.
