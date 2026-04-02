# KZG and Opening Proof Review Workflow

Step-by-step review for KZG-family commitment verification and opening proof soundness.

## Phase 1: Map commitment and opening pipeline

1. Identify commitment creation and verification entry points
2. Enumerate all proof objects and evaluation points accepted by verifier
3. Confirm scheme selection logic cannot mix incompatible proof variants

## Phase 2: Verify opening proof equations

1. Validate KZG opening proof equation implementation against specification
2. Confirm verifier binds commitment, point, value, and proof in one relation
3. Ensure failure in any check returns explicit reject

## Phase 3: Check transcript and setup binding

1. Ensure batch/random challenges are derived after all commitments are absorbed
2. Verify trusted setup artifacts are loaded with integrity checks
3. Confirm degree constraints are enforced before acceptance

## Phase 4: Cross-reference and handoff

- Compare with `references/finding-patterns.md`
- Check `zkbugs-index` for prior commitment/opening vulnerabilities
- Forward surviving findings to `crypto-fp-check`
