# mpc-auditor Checklist

## Security model and claims

- [ ] The adversary model, corruption threshold, and output guarantee are
      stated and match who runs each party in deployment.
- [ ] Every composed sub-protocol meets the claimed model, and statistical
      parameters (MAC field size, cut-and-choose or bucket counts) give the
      stated security level.

## Participant, role, and transcript/session separation

- [ ] Participant authentication is enforced before any protocol state update.
- [ ] Sender/receiver role assumptions are explicit, fixed per session, and
      validated by every handler.
- [ ] Session identifiers bind participants and roles to the expected
      protocol instance.
- [ ] Transcript messages, hashes, and commitments include session-specific
      binding values.
- [ ] Old transcripts cannot be replayed into new rounds.
- [ ] Concurrent sessions are isolated with disjoint state and keys.
- [ ] A retry after abort reuses no labels, correlations, or randomness.

## Oblivious transfer and input consistency

- [ ] OT sender/receiver code enforces the expected role semantics.
- [ ] Input consistency checks prevent cross-role value substitution; a
      party's OT input equals the value it uses in every other copy or round.
- [ ] OT transcript commitments and check messages are validated before use.
- [ ] Base-OT group elements are validated before key derivation; base OTs
      and the correlation secret are not shared across counterparties.
- [ ] A malicious-secure extension runs its construction's consistency
      check, aborts on failure, and discards the correlation secret then.
- [ ] The OT output hash is tweaked with the transfer index.

## Garbled circuits

- [ ] Labels and the free-XOR offset come from a CSPRNG, fresh per
      garbling; with point-and-permute the offset's permute bit is 1.
- [ ] No garbled circuit, label, or offset is evaluated on two different
      inputs; labels cannot collide or repeat across gates or sessions.
- [ ] The gate hash has a tweak unique per gate and half-gate, and its
      instantiation (including fixed-key AES modes) is proven for the
      scheme's assumption, e.g. circular correlation robustness.
- [ ] A malicious claim has a garbler-correctness mechanism: cut-and-choose
      with the challenge fixed after commitment, authenticated garbling, or
      dual execution with its leak documented.
- [ ] Evaluator failure handling is input-independent: a bad row, label, or
      OT message cannot make abort, timing, or errors depend on its input.
- [ ] Output labels returned to the garbler are checked against the
      expected pair.

## Share validation and reconstruction

- [ ] Share MAC/commitment checks are performed before the share, or any
      value derived from it, is consumed.
- [ ] Threshold requirements are enforced before reconstruction; duplicate
      or unknown contributors are rejected.
- [ ] Invalid shares are rejected without partial state mutation.
- [ ] Shares, MACs, and openings are parsed as canonical field or ring
      elements; out-of-range or wrong-length encodings are rejected.
- [ ] A SPDZ-style MAC check covers every opened value, fixes its random
      coefficients after the openings, commits to check shares before
      revealing them, and passes before any output is released.
- [ ] MAC key shares are never logged, and never opened unless the
      construction's check reveals the key (the 2012 SPDZ check does, so
      its preprocessing serves one evaluation; the 2013 check does not).
- [ ] Inputs the function assumes are bits or bounded are constrained
      inside the computation.
- [ ] Honest-majority reconstruction checks all received shares against one
      polynomial of the expected degree, not a minimal subset.

## Offline/online split

- [ ] Offline Beaver triples are authenticated (MAC'd and correctness
      checked by sacrifice or bucketing) before online usage.
- [ ] The online phase cannot consume unauthenticated preprocessing
      material, or material made for another party set or MAC key.
- [ ] Phase transitions are explicit and auditable.
- [ ] Each triple, mask, and random bit is consumed at most once; the
      consumption index survives crash and restart.

## Abort, fairness, and broadcast

- [ ] Where the protocol assumes broadcast, an echo or hash comparison runs
      before the broadcast value is used.
- [ ] Openings are verified against commitments that bind the committer
      identity and session.
- [ ] A missing or late message causes abort, never a default value, and
      abort reasons carry no secret-dependent detail.
- [ ] If one party learns the output first and can abort, the application
      tolerates it or the unfairness is documented.
