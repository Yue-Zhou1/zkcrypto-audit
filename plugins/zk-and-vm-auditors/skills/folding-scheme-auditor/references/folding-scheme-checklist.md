# Folding Scheme Checklist

For Nova, SuperNova, HyperNova, ProtoStar/ProtoGalaxy, Sangria-style, and
other folding-based proof systems in Rust. Record scheme, cycle, and paper.

## Folding relation and error term

- [ ] Relaxed R1CS equation: the relation checked is `AZ ∘ BZ = u·CZ + E`;
      the error term E is updated at each fold and never truncated.
- [ ] Accumulator consistency: the running instance (u, x, W, E) aggregates
      both instances by scalar multiplication and linear combination, field
      by field, on witnesses and on commitments alike.
- [ ] The cross-term T is computed from the witnesses of both instances, is
      never zero or hardcoded, and the number of cross terms matches the
      constraint degree (higher-degree gates need more than one).
- [ ] Where the incoming instance is strict (u = 1, E = 0), the verifier
      fixes those values itself instead of reading them from the prover.
- [ ] Error term accumulation bounds: no code assumes E or u stays small or
      zero after the first fold; limb-represented accumulator values are
      reduced and range-checked at every fold so none overflows the field.
- [ ] Running instance completeness: the full witness (W, E) of the running
      instance is available at every step, under one commitment key.

## Challenge derivation

- [ ] Cross-term commitment: T is committed and absorbed into the
      Fiat-Shamir transcript before the challenge is derived; a missing or
      post-hoc T breaks binding.
- [ ] The challenge binds a digest of the public parameters, both complete
      instances (commitments, u, public IO), and every cross-term commitment.
- [ ] The in-circuit and native transcripts absorb the same values in the
      same order and encoding, and truncate the challenge to the same width.
- [ ] The challenge hash and the state hash are domain-separated when they
      share a hash function.

## Step circuit binding and base case

- [ ] IVC step public input threading: the hash of the running instance is a
      public input of the step circuit and is recomputed and checked inside
      it; otherwise an adversary substitutes any intermediate state.
- [ ] That hash covers the parameter digest, step counter i, initial state
      z0, current state z_i, and the complete running instance; the output
      hash covers i + 1, z0, z_{i+1}, and the folded instance.
- [ ] Base case soundness: the initial instance is the scheme's default
      instance and satisfies the relaxed relation; this is checked
      explicitly, not left to prover initialization.
- [ ] The base-case branch is selected by i = 0 inside the circuit, forces
      z_i = z0, and cannot be taken at any other step.
- [ ] The verifier rejects or separately handles a zero-step proof, and the
      step count it accepts is the i bound in the hash.
- [ ] Constraint generation in the step circuit does not depend on witness
      values: the shape in the public parameters is the shape at every step.

## Cycle of curves and non-native arithmetic

- [ ] Cycle-of-curves field compatibility: in a two-curve cycle (Pasta,
      BN254/Grumpkin) the scalar field of one curve is the base field of the
      other; every cross-curve encoding respects which field a value is in.
- [ ] Cross-curve public input range: values passed from one curve to the
      other are range-checked to fit the receiving scalar field; no
      truncation or reduction silently loses bits.
- [ ] Non-native field elements have range-checked limbs and constrained
      reductions; equality is modular, not limb-wise on unreduced values.
- [ ] In-circuit operations on commitments validate points and handle the
      identity and the exceptional cases of incomplete addition.
- [ ] Both sides of the cycle are bound: the secondary curve's instances are
      in the state hash and satisfied at the end; a delegated circuit
      (CycleFold-style) has its public IO tied to the primary circuit's values.

## Scheme variants

- [ ] HyperNova multi-folding: the relation handles all k instances; the
      sum-check protocol and the LCCCS/CCCS relation are verified per
      instance, and the two instance types are never interchanged.
- [ ] Sum-check and ProtoStar/ProtoGalaxy-style protocols: every prover
      message is absorbed before the challenge that follows it; the verifier
      derives the folded error itself, not from a prover claim.
- [ ] SuperNova: the program counter is bound in the state hash, selects the
      running instance that is folded, and is advanced by the step function.

## Decider and zero-knowledge

- [ ] Final SNARK key binding: the SNARK over the last accumulator uses the
      verifier key of the step circuit's constraint system; a mismatched key
      accepts any accumulator value.
- [ ] The decider's statement covers satisfiability of the final running
      instance (W and E opened against their commitments), the last fresh
      instance, and the state hash over (i, z0, z_i, running instance).
- [ ] The decider's public inputs include the final accumulator hash, and
      the proof is verified end-to-end, not only deserialized.
- [ ] If zero-knowledge is claimed, its source is identified (hiding
      commitments with fresh blinding, a ZK decider, or a folded random
      instance) and the uncompressed IVC proof is not sent to verifiers.
