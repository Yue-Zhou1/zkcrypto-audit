# Ethereum Crypto Checklist

Use this checklist when reviewing Rust code that uses Ethereum cryptographic APIs.

- **secp256k1 signature malleability** — verify low-s normalization is enforced; high-s signatures must be rejected or normalized before use
- **ecrecover input encoding** — hash must be 32 bytes (keccak256 output), signature 65 bytes (r ++ s ++ v); verify v convention matches the library (0/1 vs 27/28)
- **k-reuse / deterministic signing** — confirm RFC 6979 or equivalent deterministic k-generation; reject any path that allows external k input without validation
- **Recovery ID range** — recovery ID must be 0 or 1; values ≥ 2 indicate the point at infinity and must be rejected
- **keccak256 vs SHA3-256** — Ethereum keccak256 is NOT identical to NIST SHA3-256; verify no confusion between the two, especially in cross-system contexts
- **EIP-712 domain separator** — the domain separator must include chainId, verifyingContract, name, and version as applicable; missing fields allow cross-chain or cross-contract replay
- **EIP-191 prefix handling** — personal_sign prepends `\x19Ethereum Signed Message:\n{len}`; verify the prefix matches the verifier expectation exactly
- **BN254 input encoding for EIP-196/197** — G1 points are 64 bytes (32-byte x, 32-byte y); field elements must be < BN254 field modulus (21888242871839275222246405745257275088548364400416034343698204186575808495617)
- **BLS12-381 subgroup membership (EIP-2537)** — G1/G2 points must be subgroup-checked before use; missing check allows small-subgroup attacks
- **KZG trusted setup domain** — the KZG SRS must match the target circuit or blob size; a mismatched SRS produces accepting verifier behavior with no arithmetic error
- **EIP-4844 blob commitment encoding** — the versioned hash prefix (0x01) must be present; blob field elements must each be < BLS12-381 scalar field modulus
- **alloy / ethers-rs address derivation** — address must be derived from the last 20 bytes of keccak256(uncompressed_pubkey[1..]); wrong byte slice = wrong address with no error
- **Precompile error handling** — EVM precompiles return empty output on failure; verify that calling code checks return data length before decoding
