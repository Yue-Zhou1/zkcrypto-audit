# Frontend/Backend Review Workflow

Step-by-step review for gnark frontend intent, backend constraints, and witness paths.

## Phase 1: Trace frontend declarations

1. Enumerate security-critical values declared in `frontend.API`
2. Record where each value is constrained (`AssertIsEqual`, selectors, range checks, hints)
3. Identify values expected to remain private versus explicit public witness inputs

## Phase 2: Compare frontend and backend behavior

1. Compile and inspect generated backend constraints for each frontend assertion
2. Flag any frontend invariant with no backend enforcement
3. Check whether backend optimizations or selectors weaken expected constraints

## Phase 3: Review witness assignment and serialization

1. Trace Go witness assignment code paths for every frontend input
2. Verify errors are propagated and no nil/default witness values are accepted silently
3. Check witness serialization and decoding for canonical field handling and visibility integrity

## Phase 4: Handoff and verification

- Cross-reference `references/finding-patterns.md`
- Verify suspected gaps with `crypto-fp-check`
- Route confirmed findings to report generation and indexing workflows
