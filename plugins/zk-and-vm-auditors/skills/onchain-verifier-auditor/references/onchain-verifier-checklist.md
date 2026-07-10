# onchain-verifier-auditor Checklist

Concrete checks for on-chain proof-verifier contracts. Each item names the
governing source in `references/spec-sources.md`.

## Precompile invocation (EIP-196/197/2537)

- [ ] Every precompile invocation checks the low-level call success flag
      (staticcall/call return value), not only the returned data. A failed
      precompile call with an ignored success flag leaves stale or zeroed
      memory that can be misread as "pairing holds".
- [ ] The returned verifier word is decoded and compared explicitly
      (EIP-197 returns a 32-byte word equal to 1 on success, 0 on failure);
      "nonempty return" is NOT success.
- [ ] Pairing input length is validated as a multiple of 192 bytes
      (EIP-197: k pairs of 64-byte G1 + 128-byte G2). Malformed lengths make
      the precompile fail — which is only safe if the success flag is checked.
- [ ] The EIP-197 empty-input case is unreachable or intended: pairing over
      zero pairs returns success (1). A contract that builds the pairing
      input from attacker-controlled arrays must not allow an empty input.
- [ ] EIP-2537 call sites use the post-Pectra addresses and fixed operand
      sizes, and rely on the mandated subgroup checks only where EIP-2537
      actually mandates them (all BLS12-381 precompile inputs).
- [ ] Enough gas is forwarded to the precompile; a gas-starved staticcall
      fails and must be surfaced, not swallowed.

## Public inputs and field arithmetic

- [ ] Every public input is checked strictly less than the scalar field
      modulus r (for BN254:
      21888242871839275222246405745257275088548364400416034343698204186575808495617).
      A missing check lets an attacker submit input + r aliases that verify
      against a different logical statement (the classic snarkjs
      "missing < r check" bug class).
- [ ] The number of public inputs is validated against the verification
      key's IC length (IC length = number of public inputs + 1).
- [ ] Any in-contract additions/multiplications on public inputs happen via
      the 0x06/0x07 precompiles or checked modular arithmetic, not raw
      unchecked uint256 arithmetic reinterpreted as field elements.

## Point encoding and curve membership

- [ ] G1 points are encoded as (x, y) big-endian 32-byte words; G2 points as
      the EIP-197 coefficient ordering (imaginary component first:
      x_im, x_re, y_im, y_re). Swapped ordering makes valid proofs fail —
      or worse, lets a crafted point pass a hand-rolled decoder.
- [ ] The contract does not assume the precompile performs subgroup checks
      that it does not: EIP-196/197 validate on-curve membership and reject
      invalid encodings, and the BN254 G2 pairing input is checked for
      correct-subgroup membership by the precompile; EIP-2537 mandates
      explicit subgroup checks. Any point used OUTSIDE a precompile
      (e.g., hashed, compared, or stored) needs contract-side validation.
- [ ] Point-at-infinity (encoded as (0, 0) in EIP-196/197) handling is
      explicit where a zero point would trivialize an equation.

## Verification key provenance and upgrades

- [ ] The VK is immutable (constants/immutables) or every mutation path has
      explicit authorization, event emission, and — ideally — timelock.
- [ ] The deployed VK provably corresponds to the audited circuit artifact
      (regenerate the verifier from the circuit and diff, or compare VK
      constants against the ceremony/compilation output).
- [ ] Proxy/upgradeable verifiers: the implementation slot owner cannot
      silently swap the verifier for one that always returns true.
- [ ] If multiple VKs are selectable per call (VK registries, multi-circuit
      dispatchers), the selector binding is part of the audited statement.

## ABI decoding and calldata

- [ ] Proof element ordering (A, B, C for Groth16) matches the prover's
      serialization; B's G2 coefficient ordering matches EIP-197.
- [ ] Dynamic arrays of public inputs are length-checked before use; no
      implicit truncation or zero-padding of missing inputs.
- [ ] Assembly-optimized verifiers (calldataload offsets) are diffed against
      the reference layout; a single wrong offset silently verifies a
      different statement.
- [ ] The verifying function is view/static and callers act on its boolean
      result; no caller ignores the return value.
