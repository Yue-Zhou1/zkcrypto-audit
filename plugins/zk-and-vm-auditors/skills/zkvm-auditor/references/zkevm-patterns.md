# zkEVM Equivalence Finding Patterns

Patterns specific to zkEVMs — provers that attest to EVM state transitions
(Scroll, Polygon zkEVM, Linea, and similar) — as opposed to general-purpose
RISC-V/other-ISA zkVMs (SP1, RISC Zero, Valida), which the base checklist
and finding-patterns cover. The shared question here is EQUIVALENCE: does
the circuit compute exactly what mainnet EVM computes? A divergence lets a
prover attest to a state the L1 would reject.

## Z1: Opcode semantic divergence

- **Pattern:** an opcode's circuit implementation differs from EVM
  semantics on an edge case — signed division/SDIV by zero, SAR sign
  extension, EXP modular wraparound, byte/word boundary opcodes, or
  precise 256-bit arithmetic overflow behavior.
- **Impact:** the proof attests to an execution mainnet would not produce;
  a crafted transaction yields divergent state that still verifies.
- **Where:** hand-written opcode gadgets; opcodes with rare edge cases
  that KATs under-cover.

## Z2: Gas accounting divergence

- **Pattern:** the circuit's gas metering differs from geth/the Yellow
  Paper — memory-expansion gas, dynamic gas for CALL/SSTORE (EIP-2929/2200
  warm/cold and refund rules), or intrinsic gas.
- **Impact:** a transaction that runs out of gas on L1 succeeds in the
  proof (or vice versa), producing a state transition L1 would not accept;
  out-of-gas boundary is a control-flow fork.

## Z3: Memory-expansion mismatch

- **Pattern:** memory expansion cost or zero-fill semantics diverge on
  large offsets, MSIZE rounding to word boundaries, or the quadratic cost
  term.
- **Impact:** both a gas divergence (Z2) and a data divergence if expanded
  memory is not zeroed exactly as the EVM specifies.

## Z4: State/storage trie encoding errors

- **Pattern:** the account or storage Merkle-Patricia trie encoding used
  for the state root diverges from the EVM's (RLP encoding, secure-trie
  key hashing, empty-account/empty-storage pruning rules, or a substituted
  tree such as a zk-friendly trie without a proven-equivalent root).
- **Impact:** the proven state root does not match what L1 clients
  compute — bridges and light clients accept an inconsistent root, or a
  withdrawal proves against a state that never existed.

## Z5: Precompile equivalence gaps

- **Pattern:** ECRECOVER, MODEXP, the BN254 add/mul/pairing precompiles,
  IDENTITY, SHA256/RIPEMD, or BLAKE2 implemented in-circuit with different
  edge-case behavior than the EVM (ECRECOVER returning nonzero for invalid
  signatures, MODEXP with zero modulus, pairing empty-input semantics).
- **Impact:** contract logic depending on precompile results proves a
  different outcome than mainnet; overlaps with `onchain-verifier-auditor`
  concerns but here the question is circuit-vs-EVM equivalence, not an
  on-chain verifier's precompile call.

## Z6: Missing revert/exceptional-halt equivalence

- **Pattern:** stack overflow/underflow, invalid opcode, static-call state
  modification, or call-depth (1024) limits handled differently than the
  EVM's exceptional-halt semantics.
- **Impact:** a transaction that reverts on L1 partially applies in the
  proof (or the reverse), diverging state.

## Z7: Chain-configuration/hardfork drift

- **Pattern:** the circuit encodes semantics from a different hardfork than
  the deployment targets (pre/post-EIP-1559 base fee, EIP-3529 refund
  changes, EIP-3855 PUSH0, transient storage EIP-1153).
- **Impact:** systematic divergence for opcodes/rules changed at that fork
  boundary.
