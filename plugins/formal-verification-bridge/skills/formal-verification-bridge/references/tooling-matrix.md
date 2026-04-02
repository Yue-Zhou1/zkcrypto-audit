# Formal Verification Tooling Matrix

| Tool | Primary target | Prerequisites | Input format | Output shape | Limitations |
|---|---|---|---|---|---|
| Ecne | Constraint consistency checks | Local binary installed, pinned version, config profile | Normalized JSON artifact + target metadata | Pass/fail + diagnostic trace | Partial coverage for custom gate systems |
| Picus | Protocol/path verification checks | CLI tool available, environment vars configured | Structured handoff artifact + boundary map | Verdict + violated assumptions | May require manual abstraction of host-side logic |
| Circomspect | Circom circuit static/formal linting | Node toolchain + Circom project sources | Circuit graph + witness/public input descriptors | Findings list + severity tags | DSL-specific; not suitable for non-Circom targets |

## Usage notes

- Tool runs are optional and engagement-dependent.
- Always pin tool version and record invocation command.
- Fail closed when prerequisite checks fail.
