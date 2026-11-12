# cairo-auditor Spec Sources

## Normative

- Goldberg, Papini, Riabzev, "Cairo - a Turing-complete STARK-friendly CPU
  architecture" (ePrint 2021/1063). The machine model: field-element memory,
  nondeterminism, builtins, and the fact that hints are outside the proven
  statement. Governs every hint-validation check.
- Cairo 0 documentation ("How Cairo Works") and the Cairo 0 common library
  source. Hint syntax, builtin pointer discipline, and the documented input
  domains of the math and `Uint256` helpers (P7).
- The Cairo Book and the Cairo core library for the pinned compiler version.
  Cairo 1 types, felt252 and integer semantics, conversions, and panics.
- Starknet documentation: contract classes and the Sierra/CASM relationship,
  storage address derivation, the Pedersen and Poseidon hash definitions and
  the STARK curve, L1<->L2 messaging, and accounts and transaction
  validation. Governs the Sierra, storage, and contract-surface sections.
- Starknet Improvement Proposals covering the standard account interface,
  typed-data signing (SNIP-12), and outside execution. The reference for
  signature validation return values and replay domains.

## Informative

- OpenZeppelin Contracts for Cairo. Reference implementations for accounts,
  upgradeability, and component storage naming; a baseline to diff against.
- Trail of Bits, "Not So Smart Contracts" Cairo section in the
  building-secure-contracts repository. Catalog of Cairo and Starknet
  pitfalls, including L1<->L2 messaging and felt arithmetic.
- Static analyzers Amarna (Cairo 0) and Caracal (Starknet, Cairo 1). Their
  detector lists are a cross-check for the pattern hunt; tool output is
  evidence, not a verdict.
- zksecurity/zkbugs corpus, Cairo entries, reached through `zkbugs-index`:
  missing range checks on lengths, offsets, and positions in Cairo 0
  programs. Prior art for P3 and P5.
- Grassi, Khovratovich, Rechberger, Roy, Schofnegger, "Poseidon: A New Hash
  Function for Zero-Knowledge Proof Systems" (USENIX Security 2021).
  Background for the Poseidon builtin; depth belongs to
  `hash-function-auditor`.
- EIP-1967. The proxy storage-slot convention the storage-layout check names.
