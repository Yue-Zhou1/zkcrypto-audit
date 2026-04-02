# Formal Verification Bridge Handoff Contract

The bridge consumes a normalized artifact from prior audit stages. The artifact must be reproducible and include enough context for external tool replay.

## Required fields

- `engagement_id`: stable identifier for the audit engagement
- `target_component`: module/circuit/protocol scope under analysis
- `finding_context`: summary of validated issue hypothesis and impacted paths
- `trust_boundary_map`: explicit trust boundary assumptions and external dependencies
- `reproduction_steps`: deterministic steps to recreate the analyzed state
- `expected_invariant`: invariant/property the tool should evaluate
- `tool_overrides`: optional per-tool configuration controls

## Contract rules

- The normalized artifact must be immutable once exported for a run.
- Every artifact must be attributable to a verified finding context.
- Unsupported fields must be documented explicitly rather than dropped silently.
- Serialization format must be stable across reruns for comparability.
