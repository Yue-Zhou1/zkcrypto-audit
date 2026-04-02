# Lattice Finding Patterns

Common vulnerability patterns in lattice cryptographic implementations.

- **rejection sampling bias leaks structure** — acceptance criteria introduce exploitable distribution skew.
- **decryption failure probability underestimated** — implementation drift increases real-world failure rate beyond assumptions.
- **seed reuse across public/secret derivations** — shared seed contexts couple independent security domains.
- **rounding/compression mismatch between spec and code** — decode/encode paths diverge from proven bounds.
- **decapsulation reject path leaks side-channel signal** — malformed ciphertext handling reveals secret-dependent behavior.
