# MPC Finding Patterns

Common vulnerability patterns in MPC protocol implementations.

- **unchecked share accepted into reconstruction** — reconstruction proceeds without verifying share authenticity/integrity.
- **OT sender/receiver role confusion** — implementation swaps or weakens sender/receiver assumptions, enabling input substitution.
- **beaver triple not authenticated** — online multiplication consumes unverified preprocessing values.
- **garbled-table label reuse** — label collisions or reuse undermine garbled-circuit integrity.
- **session transcript reused across rounds** — stale transcript state leaks into new protocol rounds.
