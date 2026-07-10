# zkvm-auditor Spec Sources

## Normative

- Ethereum Yellow Paper (Wood; the Berlin/London and later revisions
  matching the deployment's target hardfork) — the formal EVM state
  transition, opcode semantics, gas accounting, memory expansion, exception
  handling, and the Merkle-Patricia trie/RLP state-root definitions.
  Normative for every zkEVM equivalence check (Z1-Z6).
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
- Scroll, Polygon zkEVM, and Linea architecture/spec documents — concrete
  zkEVM designs whose opcode/precompile/trie choices the equivalence
  patterns are calibrated against.
- go-ethereum (`core/vm`) — the de facto reference implementation used as
  the differential baseline for opcode and gas behavior; pair with
  `differential-test-harness-gen` to produce equivalence evidence.
