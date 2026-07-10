# verifier-contract-review.md

Executable review workflow for an on-chain proof-verifier contract.

1. **Inventory the verifier surface.**
   - `grep -rn "staticcall\|raw_call\|address(0x0[678])\|ecPairing\|pairing"`
     across the contract sources to find every precompile call site.
   - List every external/public function that accepts proof bytes or points,
     and every storage slot / constant holding VK material.

2. **Classify the verifier.** Generated (snarkjs/gnark/halo2-solidity) or
   hand-written/assembly-optimized? For generated code, obtain the generator
   version and diff the deployed source against a freshly generated verifier
   from the audited circuit artifact. Any manual edit is in scope.

3. **Check precompile invocation semantics** (checklist "Precompile
   invocation"). For each call site record: success-flag handling, output
   word decoding, input length construction, and gas forwarded. Flag any
   path where a failed call can fall through as success.

4. **Check the empty-input case.** Trace how the pairing input buffer is
   built. If any attacker-controlled array length can produce a zero-length
   input, record it as a P4 candidate (EIP-197 empty input verifies).

5. **Check public-input validation.** Confirm `input[i] < r` for every
   public input and `input.length + 1 == IC.length`. Compute what an
   `input + r` alias would mean for the application (nullifier, root,
   amount) to assess impact.

6. **Check point encodings.** For each G1/G2 operand, confirm the byte
   layout against EIP-196/197 (or EIP-2537) including G2 imaginary-first
   ordering, and confirm any point used outside a precompile is validated
   in-contract.

7. **Check VK provenance and mutability.** Identify how the VK got its
   values (ceremony output, circuit compilation), whether it can change
   after deployment, and who is authorized. Record upgrade paths as
   findings even when access-controlled (residual_risk at minimum).

8. **Check callers.** Find every contract that calls the verifier and
   confirm the boolean result gates state changes.

9. **Produce the output contract.** For each candidate finding fill
   `affected_component`, `precompile_or_verifier_path`, `invariant_at_risk`,
   `evidence` (source lines plus, for Critical/High, a forge/hardhat PoC
   sketch), `disposition`, and `next_route` (`crypto-fp-check` for
   candidates; `zk-circuit-auditor` / `ecc-pairing-auditor` for cross-domain
   suspicions).
