---
name: gnark-auditor
description: >
  Audit gnark circuits and their Go witness pipelines for values computed but
  never asserted, unconstrained hint outputs, public/secret tag errors,
  frontend API preconditions (division, comparison, bit decomposition),
  emulated-field range checks, std gadget preconditions, Groth16/PLONK backend
  differences, and setup or curve misconfiguration. Use when reviewing a
  circuit's `Define` method, hint functions, witness assignment and
  serialization, or gnark setup and verifier-export code.
allowed-tools: Read Grep Glob Bash
---

# gnark-auditor

Domain auditor for circuits written against gnark's `frontend.API` and the Go
code that assigns, serializes, proves, and verifies their witnesses. General
Go cryptography outside the circuit and its witness pipeline is out of scope.

**Core principle:** arithmetic calls in `Define` create new wires; only
`Assert*` calls and the checks inside gadgets restrict existing ones. A value
the solver can compute is not a value the verifier has checked.

## When to Use

- Reviewing a circuit struct and `Define` method: visibility tags, assertions,
  selectors, hints, and `frontend.API` call preconditions
- Reviewing emulated (non-native) arithmetic and std gadgets (range checks,
  lookups, Merkle, signatures, in-circuit verifiers)
- Reviewing Go witness construction, the verifier's public-witness
  reconstruction, and witness, proof, or key serialization
- Reviewing backend choice, setup provenance, and curve or field parameters

## When NOT to Use

- Proof-system or multi-DSL review not centered on gnark -> `zk-circuit-auditor`
- Exported Solidity verifier contracts -> `onchain-verifier-auditor`
- Transcript construction inside a backend -> `fiat-shamir-auditor`
- KZG SRS and opening-proof mechanics -> `commitment-scheme-auditor`
- Curve point decoding and subgroup checks -> `ecc-pairing-auditor`
- Rust `unsafe`, zeroization, or feature-flag issues -> `rust-crypto-safety`
- Declaring a suspected gnark issue confirmed -> `crypto-fp-check`

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The circuit tests pass" | Honest assignments show completeness only. The honest hint and witness always satisfy an under-constrained circuit; only a tampered assignment that still solves shows the gap |
| "The hint computes the right value" | Hints run in the prover's solver and emit no constraints. A malicious prover replaces the function; the verifier never sees it |
| "It is a `frontend.Variable`, so it is in the circuit" | Being a wire is not being constrained. A public field overwritten in `Define`, or a result that never reaches an `Assert*`, binds nothing |
| "The Go code builds the witness from a `uint64`" | Go types in the witness builder constrain nothing. The prover assigns any field element unless the circuit range-checks it |
| "It is a std gadget, so it is safe" | Gadgets document preconditions the caller must discharge, and the library has had soundness advisories of its own (CVE-2023-44378) |
| "`groth16.Setup` ran, so the keys are fine" | An in-process setup is a single-party setup: whoever ran it holds the toxic waste and can forge proofs. The same holds for a test-only SRS under PLONK |

## Core Review Areas

1. Public/private witness binding: tags, input order, accidental promotion
2. Frontend/backend mismatch: relations the `frontend.API` code intends vs
   constraints the compiled system contains
3. Hints: every output determined by constraints (relation, range, uniqueness)
4. Constraint API misuse: `AssertIsEqual` vs assignment, zero divisors,
   full-width comparison and decomposition, selectors, range assumptions
5. Emulated arithmetic and std gadgets: limb range checks, canonical
   reduction, documented gadget preconditions
6. Backend differences: Groth16 re-randomization, commitment extension,
   Solidity verifier export
7. Setup and curve: key provenance, curve/field mismatches, unsafe defaults
8. Go-side witness assignment and serialization boundaries

## Workflow

### Phase 1: Build and statement mapping

- Read `references/gnark-checklist.md`; pin the gnark version, curve, backend,
  and builder; write down the statement the public inputs express

### Phase 2: Frontend/backend trace

- Execute `workflows/frontend-backend-review.md`: trace each security-critical
  value from declaration or hint to the constraint that fixes it, then
  through Go assignment and serialization

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`; prioritize unasserted values, hint
  outputs, witness exposure, and modulus confusion

### Phase 4: Handoff

- Send every surviving candidate to `crypto-fp-check`; severity is assigned
  there, not here
- Cross-route exported verifiers to `onchain-verifier-auditor`, proof-system
  questions to `zk-circuit-auditor`, in-circuit Merkle or hash design to
  `merkle-tree-auditor` and `hash-function-auditor`
- Query `zkbugs-index` for prior art when a candidate matches a known pattern;
  contributing an entry happens only after verification

## Output Contract

Produce a gnark handoff listing each candidate with:

- `circuit_and_backend`: circuit type, curve, backend, builder, gnark version
- `value_path`: the frontend declaration, hint output, or witness boundary
  involved, and the backend constraints (or their absence) on its path
- `issue_class`: `frontend_backend_mismatch`, `witness_exposure`,
  `assignment_or_serialization`, `api_misuse`, or `field_or_setup_parameter`
- `evidence` (file:line references, test or tool output)
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/gnark-checklist.md](references/gnark-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/frontend-backend-review.md](workflows/frontend-backend-review.md)
