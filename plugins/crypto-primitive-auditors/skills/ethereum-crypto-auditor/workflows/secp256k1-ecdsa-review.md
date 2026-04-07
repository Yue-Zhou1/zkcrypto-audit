# secp256k1 / ECDSA Review Workflow

## Step 1: Locate all signing and verification entry points

```bash
grep -rn "sign\|ecrecover\|recover\|verify_signature\|k256\|secp256k1\|ecdsa" \
  --include="*.rs" .
```

For each entry point, record: signing or verification, library in use (k256,
secp256k1, alloy-primitives, ethers), whether deterministic k-generation is
used.

## Step 2: Check low-s normalization

For each signature produced or accepted:
- For `k256` crate: `Signature::normalize_s()` must be called before serialization
  unless the library enforces it (check crate version release notes)
- For `secp256k1` crate: `Signature::normalize_s()` exists and must be called
- Flag any path that accepts a signature without checking or normalizing s

## Step 3: Check ecrecover input construction

For each ecrecover call:
- Hash input must be exactly 32 bytes (keccak256 output, not the raw message)
- Signature: r (32 bytes) ++ s (32 bytes) ++ v (1 byte) = 65 bytes total
- Confirm v convention: library may expect 0/1 or 27/28 — mismatch produces
  a different recovered address with no error

## Step 4: Check recovery ID range

Recovery ID (v % 27 or v directly depending on library) must be 0 or 1.
Values ≥ 2 indicate the point at infinity and must be rejected. Check the
calling code validates the raw v value before passing to ecrecover.

## Step 5: Check EIP-712 / EIP-191 construction

For each hashed structured message:
- EIP-191: prefix must be exactly `\x19Ethereum Signed Message:\n{len}` where
  `{len}` is the byte length of the message as a decimal string
- EIP-712: `structHash` must include all typed fields; domain separator must
  include `chainId` and `verifyingContract` where applicable; missing fields
  allow replay across chains or contracts

## Step 6: Validate address derivation

For each address derived from a public key:
- Confirm full uncompressed public key (64 bytes, no 0x04 prefix) is passed to keccak256
- Take the last 20 bytes of the keccak256 output as the address
- Off-by-one in byte slice = silently wrong address
