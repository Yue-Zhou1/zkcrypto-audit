# Sponge Review Workflow

Step-by-step review of sponge construction and hash call-site correctness.

## Phase 1: Inventory and spec alignment

1. Identify all sponge constructors and parameter sets in use
2. Map each API to its intended security level and protocol context
3. Confirm implementation parameters match spec or design document

## Phase 2: Absorption and squeezing verification

1. Review absorption logic for block splitting, padding, and rate limits
2. Verify squeezing behavior cannot leak state due to incorrect capacity handling
3. Flag any path where callers can over-absorb without rejection or binding

## Phase 3: Domain and call-site checks

1. Verify domain tags are distinct across protocol uses
2. Check serialization/canonicalization before absorption
3. Ensure transcript and Merkle contexts cannot collide by design

## Phase 4: Cross-reference and handoff

- Compare with `references/finding-patterns.md`
- Check `zkbugs-index` for prior sponge/parameter incidents
- Forward surviving findings to `crypto-fp-check`
