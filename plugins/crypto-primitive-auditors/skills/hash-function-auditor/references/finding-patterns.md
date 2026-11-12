# hash-function-auditor Finding Patterns

## P1: Round constants without provenance

- **Pattern:** Poseidon (or other) round constants generated from a weak
  or undocumented seed, or hardcoded with no way to regenerate them.
- **Impact:** constants may carry hidden structure or a reduced margin.

## P2: Round count insufficient for the claimed security level

- **Pattern:** MiMC below ceil(log_alpha(p)) rounds, or Poseidon/Rescue
  rounds below the designers' figure for this field, width, and S-box.
- **Impact:** reduced rounds enable algebraic shortcuts (interpolation,
  Groebner basis) below the claimed level.

## P3: Parameters reused for another field, width, or S-box

- **Pattern:** constants, matrix, or round numbers copied from an instance
  over a different field or width; an exponent not coprime to p-1.
- **Impact:** no security analysis applies; a non-permutation S-box
  gives direct collisions.

## P4: MDS matrix with invariant subspace

- **Pattern:** the linear layer admits a subspace that passes through the
  partial rounds without activating the S-box.
- **Impact:** an algebraic shortcut undermines the diffusion guarantees.

## P5: Sponge capacity overflow

- **Pattern:** absorbing more elements than the rate allows writes into
  capacity cells, or the excess is dropped, with no rejection.
- **Impact:** state-mixing assumptions break; the caller controls the
  capacity, or distinct inputs share a digest.

## P6: No capacity in compression mode

- **Pattern:** every state cell is caller input and the output is a
  truncation of one permutation call with no feed-forward.
- **Impact:** preimages and collisions by inverting from chosen outputs.

## P7: Ambiguous padding or length

- **Pattern:** variable-length input zero-padded to the rate with no
  length encoding; an unpadded API used on variable-length data.
- **Impact:** [a] and [a, 0] collide; block boundaries can be shifted.

## P8: Missing domain separation between hash uses

- **Pattern:** Merkle node hashing, field-element hashing, transcript
  hashing, or different arities share one instance and IV.
- **Impact:** identical inputs in different contexts collide semantically;
  a value valid in one role is replayed in another.

## P9: Lossy input encoding or short output

- **Pattern:** bytes reduced modulo p before absorbing, non-injective
  packing, or a digest truncated below twice the collision target.
- **Impact:** distinct inputs map to one preimage, or collisions become
  feasible at the truncated width.

## P10: Pedersen hash relied on beyond its properties

- **Pattern:** Pedersen hash used for collision-resistance claims without
  caveats: on variable-length input, as a random oracle or PRF, or with
  generators of unknown origin.
- **Impact:** false security assumptions; algebraic relations between
  outputs are exploitable where pseudorandomness was assumed.

## P11: Native and in-circuit implementations diverge

- **Pattern:** different constants, round order, IV, or input range
  between the gadget and the native hash.
- **Impact:** the circuit accepts digests the native code never produces
  (or the reverse); commitments and roots stop matching across layers.
