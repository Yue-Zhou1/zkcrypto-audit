# Merkle Tree Finding Patterns

- **Leaf and internal node hash without domain separation** — leaf-as-node confusion enables second-preimage style forgery.
- **Proof verification accepts empty path** — verifier may accept arbitrary value as valid root.
- **Sparse tree default value collides with valid leaf hash** — empty branches can impersonate real membership.
- **Multi-proof batch shares intermediate nodes without index binding** — invalid paths can be smuggled through shared state.
- **Root update does not verify old root before replacement** — attacker can rewrite state root without authenticated prior state.
