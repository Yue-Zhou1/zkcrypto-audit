# Side-Channel Finding Patterns

Common vulnerability patterns in constant-time and leakage-sensitive code.

- **branch on secret scalar bit** — scalar-dependent branch exposes key information.
- **precomputed table indexed by secret nibble** — cache behavior leaks secret-derived lookup patterns.
- **compiler optimization reintroduces branch** — build profile undoes constant-time source intent.
- **zeroization omitted on hot path** — sensitive buffers remain in memory after use.
- **error timing leaks secret validity** — failure latency differs based on secret-dependent checks.
