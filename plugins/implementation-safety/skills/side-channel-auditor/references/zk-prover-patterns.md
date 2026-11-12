# ZK Prover-Side Leakage Patterns

Use when the codebase includes a ZK prover (generates proofs, not just verifies).

## Witness Timing Leakage

MSM (multi-scalar multiplication) runtime usually depends on the scalars:
common implementations skip zero scalars and zero window digits. When MSM runs
over witness-bearing data, its duration leaks information about the witness to
an observer measuring proof generation time (Zcash proving time correlated with
the number of non-zero witness elements, and through it with the transaction
amount). An FFT/NTT runs the same butterfly sequence for every input, so it
leaks only where the field arithmetic underneath is variable-time or the code
special-cases zero or sparse inputs.

Look for:
- MSM over private scalar inputs without constant-time padding or blinding
- FFT over witness polynomials on variable-time field arithmetic or with
  zero/sparse shortcuts, in a context where timing is externally observable
- Loop counts or early exits that depend on witness values rather than fixed bounds

## Cloud Prover Witness Exposure

Delegating proof generation to a remote service requires transmitting the witness.
If the witness contains sensitive data (private keys, secret shares, confidential
inputs), this creates a trusted-party assumption not mentioned in the protocol spec.

Check for:
- API calls that serialize and transmit witness data to external endpoints
- Witness data logged at DEBUG or TRACE level in production configurations
- Witness passed to third-party proving services without explicit trust model in docs

## Witness Reuse Across Proof Generations

Reusing blinding factors or randomness across multiple proof generations leaks
relationships between witnesses. In homomorphic polynomial commitment schemes, a
blinding factor shared by two proofs for different witnesses cancels in the
difference of the commitments, leaving an unblinded commitment to the difference
of the witnesses.

Check for:
- Shared RNG seeds or deterministic blinding across proof generation calls
- Blinding factors stored in a struct and reused in a subsequent proof
- Opening randomness derived from a deterministic function of the witness value

## Prover API Timing Variance

Externally observable latency differences between proving paths reveal information
about the witness structure. If one witness value causes an early termination in
the prover loop, the proof time is shorter and the witness class is revealed.

Look for:
- Conditional branches in the hot proving loop that depend on witness bits
- Error paths that return early (shorter time) vs success paths (full proving time)
- Proof generation time logged or exposed via API response latency
