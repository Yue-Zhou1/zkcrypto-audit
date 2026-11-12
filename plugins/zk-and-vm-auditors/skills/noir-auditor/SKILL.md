---
name: noir-auditor
description: >
  Audit Noir circuits for unconstrained function boundary failures, oracle
  validation gaps, Brillig/ACIR consistency issues, and witness-generation
  soundness bugs: hinted values never re-constrained in ACIR, `Field`
  wraparound and truncating casts, missing `pub` bindings, unasserted
  black-box results, and slice or generic length assumptions. Use when
  reviewing Noir programs or libraries with `unconstrained` functions, oracle
  calls, integer/field conversions, or recursive proof verification.
allowed-tools: Read Grep Glob Bash
---

# noir-auditor

Domain auditor for Noir circuits and the boundary between Brillig
(unconstrained execution) and ACIR (the constraints the verifier checks).

**Core principle:** everything computed in an `unconstrained` function or
returned by an oracle is prover advice. It becomes part of the statement only
through an assertion in constrained code.

## When to Use

- Reviewing Noir circuits with unconstrained helper functions
- Auditing oracle and foreign calls and their constraint bindings
- Checking functions compiled for both runtimes for Brillig vs ACIR drift
- Reviewing `Field`/integer arithmetic, casts, `pub` inputs and return
  values, black-box functions, and slice or generic length handling
- Reviewing witness generation code for proof-soundness assumptions

## When NOT to Use

- Generic ZK circuit review across multiple DSLs -> `zk-circuit-auditor`
- Cairo contracts and Starknet hint analysis -> `cairo-auditor`
- Aztec note and nullifier semantics -> `privacy-protocol-auditor`
- Exported Barretenberg Solidity verifiers -> `onchain-verifier-auditor`
- Backend transcript internals -> `fiat-shamir-auditor`
- Marking a suspected issue as confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The unconstrained function is deterministic" | Determinism describes the honest prover. A malicious prover returns any value from Brillig; only ACIR constraints restrict it |
| "There is an `assert` inside the unconstrained function" | That assertion runs during witness generation and emits no constraint. The verifier never learns it existed |
| "`nargo test` passes" | Tests execute honest witness generation. An under-constrained program passes every positive test; only a tampered hint that still executes shows the gap |
| "The `unsafe` block has a safety comment" | The comment is a claim by the author. The compiler does not check that the stated constraint exists after the block |
| "`x as u64` makes sure it fits" | A cast truncates; it is not a range assertion. The high bits are discarded and the proof still verifies |
| "The black-box function verified it" | Signature and proof verification calls return a value or take a key the caller must bind. A discarded result or an unpinned key hash verifies nothing the statement relies on |

## Core Review Areas

1. Unconstrained function boundary: values crossing from Brillig to ACIR
   without an assertion that determines them
2. Oracle safety: external oracle results trusted without constraint binding
3. Brillig vs ACIR consistency: optimized Brillig diverging from ACIR
4. Witness generation: prover-side computation producing values the
   constraints accept but the application forbids
5. Type and bounds discipline: `Field` wraparound, truncating casts,
   monomorphization and indexing assumptions crossing trust boundaries
6. Statement: `pub` parameters and return values, private inputs the verifier
   wrongly relies on
7. Black-box and standard-library preconditions: asserted results, bound
   message hashes and verification-key hashes, length arguments

## Workflow

### Phase 1: Boundary inventory

- Read `references/noir-checklist.md`; pin the compiler and backend versions
- Enumerate every unconstrained function return that reaches constrained logic

### Phase 2: Boundary review

- Execute `workflows/unconstrained-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`; prioritize unconstrained boundaries,
  unbound oracle outputs, and Brillig/ACIR drift

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route Aztec note and nullifier logic to `privacy-protocol-auditor`,
  exported verifiers to `onchain-verifier-auditor`, proof-system questions
  to `zk-circuit-auditor`, signature semantics to `signature-scheme-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

## Output Contract

Produce a Noir handoff listing each candidate with:

- `boundary_site`: the unconstrained function, oracle path, black-box call,
  or Brillig/ACIR boundary involved, with its constrained call site
- `missing_constraint`: the exact constrained assertion or binding step that
  is absent
- `issue_class`: `boundary`, `oracle`, `backend_consistency`,
  `witness_generation`, or `type_or_statement`
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/noir-checklist.md](references/noir-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/unconstrained-review.md](workflows/unconstrained-review.md)
