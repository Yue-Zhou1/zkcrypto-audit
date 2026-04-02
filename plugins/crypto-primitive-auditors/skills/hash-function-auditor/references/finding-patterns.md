# Hash Function Finding Patterns

- **Poseidon round constants generated from weak seed or hardcoded without provenance** — constants may carry hidden structure or reduced security margin.
- **Sponge capacity overflow from absorbing more elements than rate allows** — state mixing assumptions break when callers exceed documented absorption boundaries.
- **Missing domain separation between Merkle tree hashing and field element hashing** — identical inputs in different contexts collide semantically.
- **MiMC round count insufficient for claimed security level** — reduced rounds enable practical cryptanalytic shortcuts.
- **Pedersen hash used for collision resistance claims without caveats** — misuse of primitive properties creates false security assumptions.
- **MDS matrix with invariant subspace allowing algebraic shortcut** — structural weakness undermines permutation diffusion guarantees.
