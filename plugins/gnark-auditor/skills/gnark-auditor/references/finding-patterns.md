# gnark Finding Patterns

Common vulnerability patterns in gnark frontend/backend and witness flows.

- **frontend witness accepted but backend constraint omitted** — value reaches proving pipeline but the generated backend system never constrains it.
- **secret value promoted to public witness** — private input is exposed through witness visibility tags or wrapper defaults.
- **nil/error ignored during witness assignment** — witness builder drops assignment errors and continues with partially initialized values.
- **field element parsed in one modulus and constrained in another** — decoding and constraint systems use inconsistent field assumptions.
- **selector path bypasses validation** — selector-controlled constraints allow unbounded values in disabled branches to influence outputs.
