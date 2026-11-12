# stateful-hash-signature-review.md

Executable review workflow for stateful hash-based signatures (XMSS,
XMSS^MT, LMS, HSS) under NIST SP 800-208. The core question: can any
sequence of crashes, restores, clones, or races cause one OTS index to
sign twice?

1. **Map the state machine.** Where does the OTS index live (file, DB,
   HSM), who increments it, and what orders increment vs signature
   release? Draw the write-ahead sequence explicitly.

2. **Check persist-before-release.** The incremented index must be
   durably committed (fsync/transaction) BEFORE any signature bytes are
   returned. Grep the signing path for the persistence call and confirm
   ordering and durability flags. A crash window between release and
   persist is a P1 finding, full stop.

3. **Check crash recovery.** On restart, the signer must skip forward
   (burn a reservation window), never "resume" at the last recorded
   index. Verify the reservation-window size is persisted before use.

4. **Check backup/restore.** Restoring signer state restores an old
   index. SP 800-208 §8.1 forbids exporting private keying material, so
   a conforming module has no private-key backup; redundancy comes from
   distributed multi-tree keys (§7). For deployments outside that
   profile, require that the key becomes unusable on restore OR that
   index space is reserved externally. Identify which applies;
   "operators are careful" is not a control.

5. **Check cloning/replication.** HA/failover designs must partition
   index space (HSS subtree per node; XMSS^MT branch assignment) rather
   than sharing a counter; VM snapshots of signer nodes are P1 vectors.

6. **Check hardware binding.** SP 800-208 §8.1 requires keygen and
   signing inside a hardware cryptographic module validated to FIPS
   140-2 or 140-3 Level 3 or higher physical security, with no export of
   private keying material. Assess the deployment claim and record
   deviations.

7. **Check capacity accounting.** Remaining-signature counters, halt
   thresholds, and exhaustion behavior (must hard-stop, never wrap) (P9).

8. **Produce the output contract** with
   `signature_family_and_parameter_set`, `sign_or_verify_path`,
   `state_or_sampling_invariant` (state one, e.g. "OTS index monotonicity
   across restore"), `evidence` (the exact crash/restore sequence that
   reuses an index), `disposition`, `next_route`.
