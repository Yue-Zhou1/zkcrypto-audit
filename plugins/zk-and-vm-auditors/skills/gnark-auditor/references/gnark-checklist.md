# gnark Audit Checklist

## Frontend/backend mismatch

- [ ] Every `frontend.API` assertion has a corresponding backend constraint after compile
- [ ] No security-critical branch exists in frontend logic without backend enforcement
- [ ] Backend-only optimizations do not alter the intended frontend semantics

## Public witness handling

- [ ] Public witness declarations are minimal and match protocol commitments
- [ ] No secret input is promoted to public witness by default struct tags or wrappers
- [ ] Public witness ordering and naming are stable across prover/verifier boundaries

## Hint and custom gate validation

- [ ] Hint outputs are constrained before affecting proof-critical logic
- [ ] Custom gate/selector usage cannot disable required constraints
- [ ] Constraint API misuse is checked around `AssertIsEqual`, selectors, and implicit range assumptions

## Serialization / witness decoding

- [ ] Witness serialization includes explicit versioning and format checks
- [ ] Decode errors are handled without permissive fallback defaults
- [ ] Parsed witness data preserves canonical field representation

## Curve and field configuration

- [ ] Curve and field choices are explicit and match protocol assumptions
- [ ] No value is parsed under one modulus and constrained under another
- [ ] Setup/proving/verifying components use the same curve and field parameters
