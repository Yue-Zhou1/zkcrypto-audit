# Noir Finding Patterns

Common vulnerability patterns in Noir and Brillig/ACIR integrations.

- **Unconstrained function return trusted without assertion** — return value from unconstrained helper enters constrained logic directly.
- **Oracle result used in constrained context without binding** — external data influences proof path without an explicit constraint.
- **Brillig optimization changes arithmetic semantics** — optimized Brillig path wraps or truncates where ACIR expects failure or bounds checks.
- **Witness value satisfies constraints but violates application invariant** — proof system accepts value that breaks protocol-level rule.
- **Array slice from unconstrained function used as fixed-size in constrained context** — unchecked length assumptions cross trust boundary.
