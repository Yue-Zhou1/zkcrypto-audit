# zkvm-auditor Spec Sources

## Normative

- Ethereum Yellow Paper (Wood; the revision matching the deployment's
  target hardfork; the paper is maintained only up to Shanghai, so Cancun
  and later forks are specified by EELS and the EIPs) — the formal EVM state
  transition, opcode semantics, gas accounting, memory expansion, exception
  handling, and Merkle-Patricia trie/RLP state-root definitions. Normative
  only when the target claims Ethereum execution or an Ethereum-root bridge.
- Ethereum Execution Layer Specifications (execution-specs / EELS) — the
  executable Python spec of the EVM; the practical differential oracle for
  opcode and gas equivalence when the Yellow Paper is ambiguous.
- Relevant EIPs for the target hardfork: EIP-2929/2930 (access lists,
  warm/cold gas), EIP-2200/3529 (SSTORE gas and refunds), EIP-1559 (base
  fee), EIP-3855 (PUSH0), EIP-1153 (transient storage), EIP-152 (BLAKE2),
  EIP-196/197/2537 (precompiles). Pin the exact fork the zkEVM claims
  (Z7).

## Informative

- RISC-V ISA specification and the SP1 / RISC Zero / Valida documentation —
  for the general-purpose zkVM base checks (memory consistency, syscalls,
  continuations) that precede the zkEVM-specific equivalence layer.
- SP1 and RISC Zero SDK documentation and security advisories for the pinned
  release — guest I/O, public values (the RISC Zero journal), program
  identifiers (image ID, SP1 program verification key), proof composition
  and aggregation, and mock or dev proving modes. These behaviours are
  version-specific; read them at the release in use (P3, P8-P11).
- Blum, Evans, Gemmell, Kannan, Naor, "Checking the Correctness of
  Memories" (FOCS 1991) — offline memory checking, the basis of
  multiset-style memory consistency arguments (P5).
- Haböck, "Multivariate lookups based on logarithmic derivatives" (ePrint
  2022/1530) — the LogUp lookup argument used for cross-table interactions
  in several STARK-based zkVMs; its soundness needs the number of lookups
  to stay below the field characteristic.
- Scroll, Polygon zkEVM, and Linea architecture/spec documents — determine
  each target's execution, state-tree, fee, and bridge commitments before
  applying an Ethereum-equivalence check.
- go-ethereum (`core/vm`) — the de facto reference implementation used as
  the differential baseline for opcode and gas behavior; pair with
  `differential-test-harness-gen` to produce equivalence evidence.
