# zkEVM Equivalence Finding Patterns

Patterns specific to zkEVMs — provers that attest to an EVM-like state
transition (Scroll, Polygon zkEVM, Linea, and similar) — as opposed to
general-purpose RISC-V/other-ISA zkVMs. First pin the target's claim:
Ethereum execution equivalence, an L2 execution variant, or a bridge
commitment. Do not assume a mainnet Merkle-Patricia root or fee policy; a
divergence matters when it violates that declared boundary.

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

- **Pattern:** execution gas differs from the target fork's EVM rules —
  memory expansion, CALL/SSTORE warm/cold costs, refunds, or intrinsic gas.
- **Impact:** an out-of-gas boundary changes control flow and can prove an
  invalid transition. L2 fee pricing or data fees may intentionally differ;
  compare those only to the L2's declared policy.

## Z3: Memory-expansion mismatch

- **Pattern:** memory expansion cost or zero-fill semantics diverge on
  large offsets, MSIZE rounding to word boundaries, or the quadratic cost
  term.
- **Impact:** both a gas divergence (Z2) and a data divergence if expanded
  memory is not zeroed exactly as the EVM specifies.

## Z4: State/storage trie encoding errors

- **Pattern:** the circuit, prover, and bridge disagree on the specified
  state commitment. For Ethereum-root claims, check MPT/RLP, secure-key
  hashing, and pruning; for a native zk-friendly trie, check its declared
  encoding and the bridge conversion/commitment instead.
- **Impact:** a bridge or verifier accepts a root inconsistent with its own
  commitment semantics, so a withdrawal can be proved against nonexistent
  state.

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
