# Prover-Input Authority Matrix

The guest input is the attacker's keyboard. This workflow enumerates it
completely and records, for every piece, who is allowed to choose it and what
stops anyone else.

## Phase 1: Enumerate the input

1. Locate the guest entry point (`read::<BatchInput>()`, `env::read()`,
   circuit public/private inputs) and the top-level input type.
2. List every field of that type, recursively, down to each operation
   variant of the batch's operation enum and each field of each variant.
3. List every value the guest derives from the host without reading it as
   input: hints, precompile outputs, syscalls, `cfg` flags.

## Phase 2: Fill one row per item

| Column | Values |
|---|---|
| `item` | `BatchInput.operations[i].<Variant>.<field>` or `BatchInput.<field>` |
| `source` | `signed` (by the affected party), `l1_committed` (in an accumulator or event the contract emitted), `oracle_threshold` (N-of-M signers), `prover_chosen`, `host_only` (never enters the proof) |
| `binding` | the check that ties the value to its source: signature over which struct, accumulator leaf fields, state-root inclusion, threshold count, or `none` |
| `omitted` | what the guest does if the item is absent or the list is shorter |
| `duplicated` | what happens if the item appears twice or a nonce is reused |
| `reordered` | what happens if items are applied in a different order than they arrived |
| `empty` | what the guest commits when the list has zero elements |
| `identity` | what the guest commits when an accumulator starts from its identity element (`0`, `u64::MAX`, empty hash) and is never updated |
| `stated_guarantee` | the sentence in docs, comments, or the client's threat model that this row is supposed to honour |
| `disposition` | `verified`, `false_positive`, `unverified`, `observation`, `residual_risk` |

## Phase 3: Triage rows

Rows that are candidates without further argument:

- `source = prover_chosen` and `binding = none` on any operation that moves
  value, changes configuration, sets a price, or changes who may act
- `source = l1_committed` but a field of the operation is outside the leaf
  the contract hashed (a prover-set flag riding next to committed data)
- a threshold `binding` whose count can be configured to zero
- `omitted` or `empty` outcomes that commit identity elements to public values
- `reordered` outcomes constrained only by prover-chosen sequence numbers or
  timestamps

Rows that need a code pointer before they are closed:

- `source = signed`: which struct is signed, whether the module or action
  type is inside the signed hash, whether the nonce scope matches the
  authority scope (see `crypto-audit-context` threat-model checklist)
- `source = host_only`: confirm the value cannot influence any committed
  output; if it can, it is `prover_chosen`

## Phase 4: Sibling sweep

A confirmed candidate in one row is incomplete until every sibling row
(same enum, same dispatch, same queue) has a disposition with a code pointer.
Record the sweep in the handoff. The audit is not done when the first
unauthenticated variant is found; it is done when the matrix has no blank
`disposition`.

## Phase 5: Handoff

Attach the full matrix to the `crypto-fp-check` handoff. For each candidate
include the row, the `stated_guarantee` it violates, and the minimal input
change that triggers it.
