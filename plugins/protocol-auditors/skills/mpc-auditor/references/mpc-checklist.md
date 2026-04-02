# MPC Audit Checklist

## Participant and role integrity

- [ ] Participant authentication is enforced before protocol state updates
- [ ] Sender/receiver role assumptions are explicit and validated
- [ ] Session identifiers bind participants to the expected protocol instance

## Transcript/session separation

- [ ] Transcript messages include session-specific binding values
- [ ] Old transcripts cannot be replayed into new rounds
- [ ] Concurrent sessions are isolated with disjoint state and keys

## Oblivious transfer and input consistency

- [ ] Oblivious transfer sender/receiver code enforces expected role semantics
- [ ] Input consistency checks prevent cross-role value substitution
- [ ] OT transcript commitments are validated before use

## Share validation and reconstruction

- [ ] Share MAC/commitment checks are performed before share consumption
- [ ] Threshold requirements are enforced before reconstruction
- [ ] Invalid shares are rejected without partial state mutation

## Offline/online split

- [ ] Offline Beaver triples are authenticated before online usage
- [ ] Online phase cannot consume unauthenticated preprocessing material
- [ ] Phase transitions are explicit and auditable
