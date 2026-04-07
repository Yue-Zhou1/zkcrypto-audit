# EVM Precompile and KZG Review Workflow

## Step 1: Locate all precompile and KZG interactions

```bash
grep -rn "ecrecover\|bn128\|alt_bn128\|pairing\|bls12_381\|kzg\|blob\|eip_4844\|EIP4844\|precompile" \
  --include="*.rs" .
```

Also search for direct calls at precompile addresses (0x01–0x0a):

```bash
grep -rn "0x0[0-9a-f]\b" --include="*.rs" .
```

## Step 2: BN254 input encoding (EIP-196/197)

For each bn128 add, mul, or pairing call:
- G1 point: 64 bytes total — x (32 bytes, big-endian) then y (32 bytes, big-endian)
- Both coordinates must be < BN254 field modulus (p = 21888...617)
- Pairing input: pairs of (G1 64 bytes, G2 128 bytes); G2 is (x_im, x_re, y_im, y_re)
- Scalar: 32 bytes, big-endian, must be < curve order

Check that the Rust code validates field element range before forwarding bytes to
the precompile. Out-of-range inputs cause undefined behavior on some EVM versions.

## Step 3: BLS12-381 subgroup membership (EIP-2537)

For each BLS12-381 operation (G1Add, G1Mul, G2Add, G2Mul, pairing):
- G1 points: 128 bytes; G2 points: 256 bytes; scalars: 32 bytes
- Verify subgroup membership check is performed before the operation
- Missing subgroup check enables small-subgroup attacks where a malicious
  point of small order passes all field-range checks

## Step 4: KZG / EIP-4844 usage

For each KZG commitment or opening proof operation:
- SRS must match the target blob size (4096 field elements for Ethereum mainnet)
- Versioned hash construction: sha256(commitment)[0] = 0x01, rest = sha256 output
- Blob field elements must each be < BLS12-381 scalar field modulus
  (0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001)
- Opening proof verification must use the evaluation point from the transaction,
  not a hardcoded or attacker-supplied point

## Step 5: Precompile return data handling

For every precompile call in Rust (via revm, alloy, or raw EVM interaction):
- Validate return data length matches expected output size before decoding
- Empty return = failure for most EVM precompiles; check the Rust code handles this
  path without panicking or silently accepting a zero-value result
- Do not use `output[..32]` without first verifying `output.len() >= 32`
