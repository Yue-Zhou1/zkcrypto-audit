# Noir Audit Checklist

## Unconstrained function boundaries

- [ ] Every unconstrained function return is bound by a constrained assertion before proof-critical use
- [ ] Values crossing Brillig into ACIR are validated for range and domain
- [ ] No unconstrained helper leaks unchecked values into verifier-visible outputs

## Oracle safety

- [ ] Oracle outputs are bound by constraints before use in proof logic
- [ ] Oracle input domain is validated to avoid undefined behavior
- [ ] Oracle failures cannot silently substitute permissive defaults

## Brillig vs ACIR

- [ ] No semantic divergence between Brillig optimized path and ACIR constraints
- [ ] Arithmetic semantics (wrapping/failure) are consistent across backends
- [ ] Backend-specific optimization does not bypass required checks

## Witness generation

- [ ] Prover witness generation matches constraint system expectations
- [ ] Witness helper functions cannot encode values that violate application invariants
- [ ] Witness serialization/deserialization preserves canonical forms

## Generic type monomorphization

- [ ] Generic specialization does not introduce unsound assumptions at compile time
- [ ] Monomorphized code paths preserve constraint coverage

## Array bounds

- [ ] Dynamic indexing in unconstrained functions is checked before constrained use
- [ ] Slice length assumptions are validated at boundary crossing
