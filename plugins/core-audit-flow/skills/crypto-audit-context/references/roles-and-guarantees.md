# Roles and Guarantees

Trust boundaries describe data. This table describes actors. Build it before
domain review so every guarantee becomes a hypothesis rather than an
assumption.

## Process

1. List every role that supplies input to the system or can act on it:
   prover, sequencer, batch submitter, oracle signer, feed setter, contract
   owner, upgrade admin, keeper, relayer, curator, delegated key holder,
   depositor, withdrawer, liquidator, verifier deployer.
2. For each role, write what the design promises the *other* roles when this
   role is malicious, offline, or misconfigured. Quote the doc, comment, or
   client threat model that makes the promise.
3. For each promise, name the enforcing mechanism and where it lives
   (guest check, L1 check, signature, timeout, queue). If the mechanism is
   "the role is trusted", record it as an unresolved assumption.
4. Add the non-adversarial consumers: honest users and integrators
   (indexers, bridges, custodians, accounting systems). Their row records
   what they need to verify on their own, not what they can break.
5. If the target replaces an earlier platform (an EVM chain, a prior
   contract system), list the guarantees that platform gave implicitly
   (provable receipts and logs, a public mempool, forced inclusion) and add
   each as a promise that needs an enforcing mechanism in the new design.
6. Hand the table to the domain phase. Each row with a promise and no
   enforcing mechanism is a domain candidate.

## Template

| Role | Malicious | Offline | Misconfigured | Promise to others | Enforced by | Disposition |
|---|---|---|---|---|---|---|
| prover | can choose any guest input | proofs stop | wrong vkey | cannot move value without a signature; cannot skip queued actions | guest checks; L1 queue watermark | |
| batch submitter | can order and withhold batches | settlement stalls | zero timeout | users can always exit after timeout T | deadman switch, forced-inclusion queue | |
| oracle signer | can sign any price | feeds expire | threshold zero | N-of-M signatures required | guest threshold check | |
| owner / admin | can rotate keys and roots | cannot fix params | forgets to set param | changes are visible and delayed | events, timelock | |
| delegated key holder | can act within scope | none | over-broad scope | can be revoked by the delegator at any time | nonce, revocation path | |
| depositor | can send unsupported assets | none | wrong decimals | cannot block other users' exits | queue design, asset validation | |
| user / integrator | n/a | n/a | n/a | can prove their own operation's inclusion, success, and result without trusting the sequencer | committed operation or event root, DA payload | |

Add rows for every role the target actually has. Remove rows that do not
apply rather than leaving them blank.

## Review Rule

Every High-impact finding in a proven system is a role acting outside its
promise. If the table has no row for the role a candidate needs, the table is
incomplete; fix the table, then continue.
