# EVM Precompile and KZG Review Workflow

## Step 1: Locate all precompile and KZG interactions

```bash
grep -rn "ecrecover\|bn128\|alt_bn128\|pairing\|bls12_381\|kzg\|blob\|eip_4844\|EIP4844\|precompile" \
  --include="*.rs" .
```

Also search for direct calls at precompile addresses (0x01–0x11; 0x0b–0x11 are
the EIP-2537 BLS12-381 precompiles) and common Rust calling conventions:

```bash
grep -rniE "\b0x(0[1-9a-f]|1[01])\b" --include="*.rs" .
grep -rn "Address::from_low_u64_be\|PRECOMPILE\|precompile" --include="*.rs" .
```

## Step 2: BN254 input encoding (EIP-196/197)

For each bn128 add, mul, or pairing call:
- G1 point: 64 bytes total — x (32 bytes, big-endian) then y (32 bytes, big-endian)
- Both coordinates must be < BN254 base field modulus (p = 21888...583; the
  value ending in ...617 is the group order q)
- Pairing input: pairs of (G1 64 bytes, G2 128 bytes); G2 is (x_im, x_re, y_im, y_re);
  the length must be a multiple of 192 and G2 points must have order q
- Scalar: 32 bytes, big-endian; any value up to 2^256 - 1 is accepted, so
  `s` and `s + q` alias

Check that the Rust code validates field element range before forwarding bytes to
the precompile. Out-of-range coordinates and off-curve points make the call fail
and consume all gas; they are not reduced.

## Step 3: BLS12-381 subgroup membership (EIP-2537)

For each BLS12-381 operation (G1ADD, G1MSM, G2ADD, G2MSM, pairing check; the
final EIP has no separate MUL precompile, a single multiplication is an MSM
with one pair):
- G1 points: 128 bytes; G2 points: 256 bytes; scalars: 32 bytes
- Verify subgroup membership check is performed before the operation: the MSM
  and pairing-check precompiles enforce it, G1ADD and G2ADD do not
- Missing subgroup check enables small-subgroup attacks where a malicious
  point of small order passes all field-range checks

## Step 4: KZG / EIP-4844 usage

For each KZG commitment or opening proof operation:
- SRS must match the target blob size (4096 field elements for Ethereum mainnet)
- Versioned hash construction: 0x01 followed by sha256(commitment)[1:] (the
  first byte of the digest is replaced, not prepended)
- Blob field elements must each be < BLS12-381 scalar field modulus
  (0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001)
- Blob proof verification must derive the evaluation point as the Fiat-Shamir
  challenge over the blob and commitment (`compute_challenge` in the Deneb
  polynomial-commitments spec), not a hardcoded point. The point-evaluation
  precompile takes z and y from the caller, so check how the application
  derives z; an opening at a prover-chosen point only proves p(z) = y

## Step 5: Precompile return data handling

For every precompile call in Rust (via revm, alloy, or raw EVM interaction):
- Validate return data length matches expected output size before decoding
- Empty return with a successful call = failure for ecrecover; the BN254,
  BLS12-381, and point-evaluation precompiles fail the call instead, and a
  pairing check that does not hold returns a 32-byte zero. Check the Rust code
  handles each path without panicking or silently accepting a zero-value result
- Do not use `output[..32]` without first verifying `output.len() >= 32`
