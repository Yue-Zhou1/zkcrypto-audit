# Hint Review Workflow

Step-by-step review of Cairo hint functions for soundness.

## Phase 1: Enumerate hint boundaries

1. Find all functions annotated with hint semantics or that produce witness values
2. For each hint function, identify:
   - What values it computes outside the constraint system
   - What constraints (assertions, range checks) bind those values after the hint
   - What happens if the hint returns an arbitrary value

## Phase 2: Validate constraint enforcement

For each hint output:

1. Trace the value forward to every use site
2. At each use site, check: is the value constrained by an assertion that would reject an arbitrary felt252?
3. If the value is used in arithmetic, check: does the constraint cover the result, not just the input?
4. If the value is used as an index or length, check: is there a range_check bounding it to the expected domain?

**If any use site lacks a binding constraint, flag as potential soundness issue.**

## Phase 3: Verify error paths

1. For each hint that can fail (division by zero, lookup miss, external call), check:
   - Does the error path cause the proof to abort, or does it substitute a default value?
   - If it substitutes a default, is the default value constrained to be harmless?
2. Flag any error path that silently succeeds with incorrect data.

## Phase 4: Cross-reference with known patterns

- Read `references/finding-patterns.md` for hint-level patterns
- Query `zkbugs-index` shards: `index/by_dsl/cairo.json` for prior hint-related bugs
