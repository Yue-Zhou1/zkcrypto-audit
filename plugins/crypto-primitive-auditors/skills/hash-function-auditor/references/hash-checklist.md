# hash-function-auditor Checklist

## Parameter selection and provenance

- [ ] The instance is written down for each hash in use: field, width,
      rate, capacity, S-box, full and partial rounds, constants and matrix
      source, mode (sponge, compression, keyed).
- [ ] Poseidon/Rescue/MiMC parameters match the claimed security target:
      round numbers are at least what the designers' formula or script
      gives for this field, width, S-box, and security level.
- [ ] Round constants are derived from a nothing-up-my-sleeve seed with
      provenance: the reference generation procedure reproduces them
      exactly (count, order, values).
- [ ] Constants and matrix are stored in the representation the code reads
      (canonical vs Montgomery, byte order), confirmed by a test vector.
- [ ] Parameters are not reused for a field, width, or S-box they were not
      generated for.
- [ ] Poseidon and Poseidon2 are not mixed: a Poseidon2 instance uses its
      own external and internal matrices and the initial linear layer.

## Algebraic attack resistance

- [ ] Full and partial rounds provide margin against known attacks.
- [ ] The round count covers interpolation, Groebner-basis, and
      differential risks, including later published cryptanalysis.
- [ ] MiMC uses at least ceil(log_alpha(p)) rounds, and the Feistel
      variant the count its paper specifies.
- [ ] Any deviation from a published instance (fewer rounds, another
      exponent, a changed linear layer) has its own analysis.

## S-box exponent

- [ ] The Poseidon exponent alpha is coprime to p-1, so x^alpha permutes
      the field.
- [ ] The S-box exponent is compatible with the field structure and the
      security assumptions the round numbers were computed under.
- [ ] Rescue exponent choices match the design: alpha coprime to p-1 and
      the inverse S-box exponent equal to alpha^-1 mod (p-1).

## MDS matrix

- [ ] The matrix has the expected dimension (width x width), is
      invertible, matches the specification, and is MDS where the design
      requires it (Poseidon2's layers are specified differently).
- [ ] The matrix has no invariant subspaces or unbounded subspace trails
      through the partial rounds; the reference checks pass.
- [ ] The matrix generation process is documented and reproducible.

## Sponge construction

- [ ] Sponge capacity in bits >= 2 * security_level; digest length in bits
      >= 2 * the collision target.
- [ ] Absorption and squeezing are implemented correctly: input goes only
      to rate cells, a full block triggers the permutation, output is read
      only from rate cells and at most rate elements per permutation.
- [ ] Absorbing more elements than the rate neither writes into capacity
      cells nor drops input.
- [ ] Padding and block boundaries are unambiguous: variable-length input
      is padded injectively or its length is encoded in the IV.
- [ ] Capacity cells start from a documented IV and are never set by the
      caller.
- [ ] Fixed-arity compression either reserves capacity or applies a
      feed-forward; a truncated permutation over a fully caller-controlled
      state is not used as a hash.

## Domain separation and encoding

- [ ] Different protocol contexts use unique prefixes, tags, or IVs.
- [ ] Merkle hashing and transcript hashing are separated, as are
      different arities and roles that share one permutation.
- [ ] Field element encoding is canonical before hashing: byte input is
      range-checked or packed below the field size, never silently reduced.
- [ ] Byte-to-field packing is injective, with the byte length bound.
- [ ] A truncated digest keeps >= 2 * the collision target in bits.

## Pedersen hash

- [ ] It is relied on only for collision resistance of fixed-length input,
      not as a random oracle, PRF, or hiding commitment.
- [ ] Generators are independent (hash-to-curve from a public seed) and the
      input-to-scalar encoding is injective as specified.

## In-circuit vs native

- [ ] Gadget and native code use the same constants, matrix, round order,
      and IV, from one definition or tested equal.
- [ ] Reference known-answer vectors pass in both; differential tests
      include 0 and p-1.
- [ ] Gadget inputs are constrained to the range the native code assumes.
