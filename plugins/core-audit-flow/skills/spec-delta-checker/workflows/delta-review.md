# Delta Review

Specification / implementation delta review starts from the assumption that
deviations are the **highest-probability bug locations**.

## Phase 1: Anchor the reference

- Identify the reference specification or paper that the code claims to follow
- Extract the exact validation rules, transcript inputs, parameter requirements, and error conditions that matter to the current path
- Record any caller obligations the spec leaves to the embedding application

## Phase 2: Map the implementation

- Trace the concrete code path that implements the same behavior
- Note where the implementation deviates from the reference specification or paper
- Distinguish "spec assumes caller does X" from "library enforces X"

## Phase 3: Classify the delta

- If the implementation deviates by omission, ask what attacker-controlled input now crosses the boundary unchecked
- If the implementation deviates by adaptation, verify the new behavior still preserves the original security property
- If the code shifts security to caller obligations, decide whether that shift is explicit, realistic, and safely typed

## Phase 4: Escalate or discharge

- Escalate the deviation when security depends on behavior the code does not enforce
- Discharge the deviation only when the implementation and its effective caller obligations still satisfy the same invariant

## Phase 5: Internal drift

The same review applies when the "spec" is the project's own documentation.

- Compare doc comments, enum variant docs, test names, error messages, and
  named constants against the value or behaviour the code enforces; a
  timeout documented as one value and implemented as another is a finding
  even with no external spec
- Treat every entry in a `known-issues`, accepted-risk, or "safe by
  construction" document as a hypothesis to attack, not a resolved item.
  Write down the argument the entry relies on and try to break it; a false
  accepted-risk argument is the highest-yield delta in the repository
- Record each drift with the doc location, the code location, and which one
  the client intends to be true

Documentation or comments that restate the spec are not evidence. Only the
enforced code path counts.
