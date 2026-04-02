# Side-Channel Audit Checklist

## Control-flow leakage

- [ ] Secret-dependent branches are eliminated or replaced with constant-time selection
- [ ] Error handling paths do not branch on secret validity
- [ ] Retry/abort logic does not expose secret-dependent behavior

## Memory and cache leakage

- [ ] Table lookups are not indexed by secret material
- [ ] Cache-line dependent access patterns are analyzed and mitigated
- [ ] Buffer length and alignment decisions avoid secret-dependent variation

## Arithmetic and instruction timing

- [ ] Variable-time modular reduction hotspots are identified and bounded
- [ ] Hardware-specific instructions are reviewed for data-dependent latency
- [ ] Big-integer operations avoid secret-dependent short-circuit behavior

## Compiler and build configuration

- [ ] Compiler optimization levels preserve constant-time assumptions
- [ ] Feature-flag combinations do not switch to variable-time fallbacks
- [ ] Benchmark/debug paths do not ship into production security profiles

## Operational and lifecycle behavior

- [ ] Zeroization is present on hot and error paths
- [ ] Logging does not include secret-derived validity cues
- [ ] Power-analysis amplifiers (retries, loops, repeated branching) are minimized
