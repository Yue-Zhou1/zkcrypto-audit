# VDF Finding Patterns

Common vulnerability patterns in VDF implementations.

- **verifier accepts malformed proof exponent** — exponent relation checks are incomplete or skipped.
- **challenge derived from incomplete transcript** — challenge omits required binding inputs.
- **modulus/trapdoor source unvalidated** — trusted setup assumptions are taken from unauthenticated parameters.
- **delay parameter bypass via shortcut path** — alternate code path reduces sequential work without equivalent checks.
- **batch verification reuses challenge randomness** — independent proofs become linkable or mask invalid members.
