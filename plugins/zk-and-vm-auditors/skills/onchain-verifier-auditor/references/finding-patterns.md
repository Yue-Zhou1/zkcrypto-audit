# onchain-verifier-auditor Finding Patterns

Recurring, real-world bug classes in on-chain verifier contracts, with root
causes and where to look.

## P1: Missing scalar-field range check on public inputs

- **Pattern:** `verifyProof` consumes `uint256[] input` without
  `require(input[i] < SNARK_SCALAR_FIELD)`.
- **Root cause:** treating uint256 as a field element; the EVM does not
  reduce inputs mod r.
- **Impact:** input aliasing — `x` and `x + r` verify the same proof but mean
  different application-level values (double-spend of nullifier-like inputs).
- **Where:** older snarkjs-generated verifiers, hand-rolled verifiers, and
  application contracts that pre-process inputs before calling the verifier.

## P2: Ignored precompile call success flag

- **Pattern:** `staticcall(gas(), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)`
  with the success flag discarded; only `mload(out)` is compared.
- **Root cause:** assembly ergonomics; assuming precompiles cannot fail.
- **Impact:** on failure the output memory is unmodified — if it aliases
  previously-written memory containing 1, a failed pairing reads as success.
- **Where:** assembly pairing helpers, gas-optimized forks of generated code.

## P3: Nonempty-return-means-success (Vyper/raw_call variant)

- **Pattern:** `raw_call(..., max_outsize=32)` treated as success when data
  came back, without decoding the returned word.
- **Root cause:** conflating "call returned data" with "pairing held".
- **Impact:** EIP-197 returns a 32-byte word of 0 on a failed pairing —
  nonempty but false; forged proofs verify.

## P4: Attacker-reachable empty pairing input

- **Pattern:** pairing input assembled by looping over caller-supplied
  arrays; a zero-length array yields an empty precompile input.
- **Root cause:** EIP-197 defines the empty product as success (returns 1).
- **Impact:** proof bypass with an empty proof/points array.

## P5: Mutable or unauthenticated verification key

- **Pattern:** `setVerificationKey`, upgradeable proxy over the verifier, or
  a VK registry keyed by attacker-influencable ID.
- **Root cause:** operational flexibility without binding VK to governance.
- **Impact:** whoever controls the VK proves anything; the circuit audit
  becomes irrelevant.

## P6: Proof/points calldata layout mismatch

- **Pattern:** hand-edited assembly verifier reads proof B at the wrong
  calldata offset, or swaps G2 real/imaginary coefficient order.
- **Root cause:** EIP-197's G2 encoding (imaginary first) diverges from most
  library serializations.
- **Impact:** honest proofs fail (DoS) or, combined with a permissive
  decoder, a crafted proof verifies a different statement.

## P7: Public input count not bound to VK

- **Pattern:** loop over `input.length` while the VK's IC array is longer or
  shorter; missing `require(input.length + 1 == IC.length)`.
- **Impact:** extra inputs silently ignored or missing inputs implicitly
  zero — the verified statement differs from the application's statement.

## P8: Caller ignores the verifier boolean

- **Pattern:** `verifier.verifyProof(...)` invoked without consuming the
  return value, or wrapped in a try/catch that continues on failure.
- **Impact:** verification is decorative; every proof "passes".
