# Accumulator Review Workflow

## Step 1: Identify the folding scheme variant

```bash
grep -rni "Nova\|HyperNova\|ProtoStar\|Sonobe\|RelaxedR1CS\|LCCCS\|CCCS\|RunningInstance\|Accumulator\|IVC\|folding" \
  --include="*.rs" .
```

Identify:
- The folding scheme (Nova, HyperNova, ProtoStar, Sonobe, or custom)
- The cycle of curves in use (Pasta: Pallas/Vesta; BN254/Grumpkin; or other)
- The step circuit type (R1CS, Plonkish, or custom)

## Step 2: Verify the relaxed R1CS folding equation

For each `fold` or equivalent operation:
- Locate the code that produces the new running instance from two input instances
- Nova: new `E = E1 + r·T + r²·E2`; new `u = u1 + r·u2`; new `x = x1 + r·x2`
- Verify T (cross-term) is computed from witnesses of both instances before folding
- Verify T is committed and the commitment is sent to the transcript before
  the challenge `r` is derived

Flag any fold where T is zero, hardcoded, or added to the transcript after `r`.

## Step 3: Check Fiat-Shamir challenge construction

For the challenge `r`:
- Transcript must absorb: both instance commitments, the cross-term commitment
- Challenge must be derived AFTER all commitments are absorbed
- For HyperNova: verify the sumcheck transcript is correctly constructed per round

## Step 4: Verify IVC step public input threading

For the step circuit:
- The circuit's public input `x` must include a commitment to or hash of the
  running accumulator from step i−1
- The circuit must verify this value internally (not just accept it as an input)
- Base case check: at step 0 the running instance must be the trivial instance
  (u = 1, E = 0, witnesses trivially satisfying); the verifier must check this
  explicitly rather than relying on the prover to initialize it correctly

## Step 5: Check cycle-of-curves encoding

For each public input that crosses curve boundaries:
- The encoding must fit in the scalar field of the receiving curve
- Rust code must explicitly range-check the value before use
- Locate the field-element encoding/decoding code and confirm field size bounds
  are respected; look for truncation or modular reduction that silently loses bits

## Step 6: Verify the final SNARK

For the SNARK produced over the last accumulator:
- Confirm the verifier key matches the step circuit's constraint system
- Confirm the public inputs to the SNARK include the correct final accumulator hash
- Confirm the SNARK proof is verified end-to-end, not just deserialized
