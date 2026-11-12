# Ethereum Crypto Checklist

Use this checklist when reviewing Rust code that uses Ethereum cryptographic APIs.

- **secp256k1 signature malleability** — verify low-s normalization is enforced; high-s signatures must be rejected or normalized before use
- **ecrecover input encoding** — hash must be 32 bytes (keccak256 output), signature 65 bytes (r ++ s ++ v); verify v convention matches the library (0/1 vs 27/28)
- **k-reuse / deterministic signing** — confirm RFC 6979 or equivalent deterministic k-generation; reject any path that allows external k input without validation
- **Recovery ID range** — recovery ID must be 0 or 1; values 2 and 3 mean the x-coordinate of R was ≥ n and was reduced (not the point at infinity). The ecrecover precompile accepts only v = 27 or 28, so they must be rejected
- **keccak256 vs SHA3-256** — Ethereum keccak256 is NOT identical to NIST SHA3-256; verify no confusion between the two, especially in cross-system contexts
- **EIP-712 domain separator** — the domain separator must include chainId, verifyingContract, name, and version as applicable; missing fields allow cross-chain or cross-contract replay
- **EIP-191 prefix handling** — personal_sign prepends `\x19Ethereum Signed Message:\n{len}`; verify the prefix matches the verifier expectation exactly
- **BN254 input encoding for EIP-196/197** — G1 points are 64 bytes (32-byte x, 32-byte y); coordinates must be < BN254 base field modulus p (21888242871839275222246405745257275088696311157297823662689037894645226208583); the number ending in 495617 is the group order q, not p
- **BLS12-381 subgroup membership (EIP-2537)** — G1/G2 points must be subgroup-checked before use; the MSM and pairing-check precompiles enforce this, G1ADD and G2ADD only check that points are on the curve; missing check allows small-subgroup attacks
- **KZG trusted setup domain** — the KZG SRS must be the one the commitments were made under and cover the target circuit or blob size; a different SRS makes honest proofs fail, and an SRS whose secret is known (a test or locally generated setup) lets anyone forge opening proofs, with no arithmetic error in either case
- **EIP-4844 blob commitment encoding** — the versioned hash prefix (0x01) must be present; blob field elements must each be < BLS12-381 scalar field modulus
- **alloy / ethers-rs address derivation** — address must be derived from the last 20 bytes of keccak256(uncompressed_pubkey[1..]); wrong byte slice = wrong address with no error
- **Precompile error handling** — ecrecover returns empty output on failure while the call itself succeeds; the BN254, BLS12-381, and point-evaluation precompiles fail the call and consume all gas supplied; a pairing check that does not hold succeeds and returns a 32-byte zero. Verify that calling code checks call status, return data length, and the returned value before decoding
