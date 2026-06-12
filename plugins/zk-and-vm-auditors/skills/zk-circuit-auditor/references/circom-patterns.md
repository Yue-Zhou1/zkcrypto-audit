# Circom Library-Specific Finding Patterns

Use when the codebase contains `.circom` templates, typically built on
circomlib and proven with snarkjs (Groth16/PLONK). Circom is the largest
DSL shard in `zkbugs-index` — check `index/by_dsl/circom.json` for prior
art before writing up any finding in this family.

## Assigned but Unconstrained (`<--` vs `<==`)

`<--` assigns a witness value without generating a constraint; only `<==`
(or an explicit `===`) binds the signal. Any `<--` that is not followed by
a constraint covering the same signal lets the prover substitute an
arbitrary value.

Grep every `<--` and demand the accompanying `===`. Common variants in the
corpus: intermediate hash states, decoded lengths, division/modulo helper
signals, and byte-shift temporaries.

## Comparator Bit-Width Overflow

circomlib `LessThan(n)`, `GreaterThan(n)`, and friends are only sound when
both inputs are already constrained to `n` bits. An unconstrained input can
exceed `2^n`, wrap inside the comparator's internal `Num2Bits(n+1)`, and
flip the comparison result.

For every comparator instantiation, find the preceding range constraint
(`Num2Bits` or equivalent) on **both** inputs. "The input comes from a
trusted signal" is not sufficient if that signal is a private witness.

## Field Element Aliasing (`Num2Bits(254)` and friends)

Bit decompositions at or above 254 bits over BN254 do not uniquely
represent a field element: values `x` and `x + p` produce different valid
bit patterns. Use `Num2Bits_strict` / `AliasCheck` for full-width
decompositions. The same aliasing applies to byte-packing templates that
accept ≥ 31 bytes into one field element.

## Unmet Caller Obligations on circomlib Templates

Many circomlib templates document preconditions they do not enforce:
inputs assumed binary, points assumed on-curve and in the prime-order
subgroup (BabyJubJub cofactor 8), values assumed range-checked. Reusing a
template without re-establishing its preconditions is the single most
recurrent circom bug class (`Unsafe Reuse of Circuit` in zkbugs).

For each instantiated template, read its header comment and verify every
documented assumption is constrained at the call site.

## Unchecked Validity Flags and Disabled Verification Paths

Templates often emit a success/validity output signal or accept an
`enabled` input. If the caller never constrains the output flag, or the
`enabled` bit can be set to zero by the prover, the entire sub-circuit
(signature check, nullifier check, hash verification) becomes optional.
Trace every component output to a constraint; treat prover-controlled
`enabled` inputs as findings until proven otherwise.

## Field Representation and Range Mismatches

Logic written as if signals were integers fails when values are reduced
mod p: negative intermediate values, state encodings that exceed the
field, and big-integer limb arithmetic with unconstrained carries. Check
that every arithmetic path's maximum magnitude fits the field, and that
signed comparisons are implemented via range-shifted encodings.

## Wrong Translation of Business Logic

The largest soundness category in the corpus that no grep can find:
constraints that verify something subtly different from the spec —
parsing/encoding layers (base64, regex DFAs in zk-email, date encoders),
limit checks bypassable through alternate flows (swaps vs. transfers),
and nullifier or expiry checks applied to the wrong message. Audit these
against the governing specification with `spec-delta-checker` rather than
against the circuit's own comments.

## Privacy Leaks via Public Signals

Public inputs/outputs that are derived from private data (or that allow
linking proofs across sessions) leak even when the circuit is sound.
Review every public signal and ask what an observer of many proofs learns.

## Quick Triage Greps

```
grep -n '<--' --include='*.circom' -r .        # unconstrained assignments
grep -n 'LessThan(\|GreaterThan(\|GreaterEqThan(\|LessEqThan(' -r .
grep -n 'Num2Bits(25[34]\|Bits2Num(25[34]' -r . # aliasing candidates
grep -n 'enabled\|isEnabled' --include='*.circom' -r .
```
