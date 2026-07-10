# onchain-verifier-auditor Spec Sources

Authoritative sources backing the checklist. Normative sources define the
required behavior; informative sources document bug history and generator
behavior.

## Normative

- EIP-196 — "Precompiled contracts for addition and scalar multiplication on
  the elliptic curve alt_bn128" (Final). Defines 0x06/0x07 input encoding,
  invalid-encoding failure semantics, and point-at-infinity as (0, 0).
- EIP-197 — "Precompiled contracts for optimal ate pairing check on the
  elliptic curve alt_bn128" (Final). Defines the 0x08 pairing check: 192-byte
  pair units, G2 coefficient ordering (imaginary component first), 32-byte
  0/1 return word, empty input returning 1 (success), and failure on
  malformed input or points not on the curve / not in the correct subgroup.
- EIP-2537 — "Precompile for BLS12-381 curve operations" (Final, scheduled in
  Pectra). Defines BLS12-381 precompile addresses, fixed operand sizes, and
  mandatory subgroup checks on all inputs.
- EIP-1108 — "Reduce alt_bn128 precompile gas costs" (Final). Governs current
  gas budgeting for 0x06/0x07/0x08 call sites.
- Groth16: Jens Groth, "On the Size of Pairing-based Non-interactive
  Arguments", EUROCRYPT 2016 (ePrint 2016/260). Defines the verification
  equation and the role of public inputs in the IC linear combination —
  normative for what the contract must compute.

## Informative

- snarkjs verifier templates (iden3/snarkjs, `templates/verifier_groth16.sol.ejs`)
  — generator behavior for the scalar-field check on public inputs; older
  generated verifiers lacking `require(input[i] < r)` are the canonical P1
  instance.
- Solidity documentation — low-level call/staticcall return semantics
  (success flag and returndata) for the P2/P3 patterns.
- Vyper documentation — `raw_call` semantics (`max_outsize`, `revert_on_failure`)
  for the P3 pattern.
- go-ethereum `core/vm/contracts.go` — reference implementation of the
  EIP-196/197/2537 precompiles; useful to confirm exact validation behavior
  when the EIP text is ambiguous.
