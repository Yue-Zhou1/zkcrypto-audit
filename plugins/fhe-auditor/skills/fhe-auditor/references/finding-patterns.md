# FHE Finding Patterns

Common vulnerability patterns in FHE implementations.

- **noise budget exhausted before claimed depth** — evaluation path exceeds safe noise threshold before completion.
- **modulus switch drops precision silently** — transform reduces correctness margin without explicit failure.
- **bootstrapping refresh misses secret-dependent term** — refresh logic omits required component and breaks soundness.
- **plaintext slots leak through debug/log paths** — operational diagnostics expose sensitive transformed data.
- **key-switch matrix mismatch accepted** — incompatible key-switch parameters are consumed without rejection.
