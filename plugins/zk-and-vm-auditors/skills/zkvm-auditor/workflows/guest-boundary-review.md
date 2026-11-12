# Guest Boundary Review Workflow

Traces what enters the guest from the host and what leaves it as public
values, and checks that the verifier pins the program in between. A valid
proof says only: "the program with this identifier ran on some input, exited
successfully, and committed these public values." Anything else the
consumer needs must be established inside the guest.

1. **Write the statement down.** Name the program identifier, each
   committed public-value field, and the consumer (contract, service,
   another guest). For an application target, field-by-field consumer
   analysis belongs to `proven-state-transition-auditor`.

2. **Enumerate inputs** in execution order, with type and deserializer.

   ```
   grep -rnE "io::read|read_vec|read_slice|env::read|env::stdin|hint|unconstrained" \
     --include='*.rs' .
   ```

   Include hints, results of unconstrained blocks, and anything derived
   from the host environment (time, randomness, cycle counts).

3. **Classify every input** as exactly one of:
   - `committed`: echoed or hashed into public values
   - `checked`: verified against a committed value (Merkle path to a
     committed root, signature under a committed key)
   - `advice`: non-deterministic help whose defining relation the guest
     re-verifies in full
   - `free`: none of the above

   A `free` input that can change a committed output or a branch is a P1
   candidate. Who operates the prover does not change the class.

4. **Check advice relations.** Write the relation each `advice` input must
   satisfy next to the check the guest performs; they must be equivalent.
   An inverse is checked by multiplication and has a zero case; a sorted
   list is checked for order and for being a permutation of the original;
   a decompressed point is checked against the compressed form including
   the sign rule. A weaker check is a P2 candidate.

5. **Walk host-influenced control flow.** For each loop bound, list length,
   option, and enum tag from the host, determine what the guest commits
   when it is empty, maximal, or repeated. Guest assertions must bind every
   such decision. Note inputs whose deserialization can panic.

6. **Lay out the public values.** List every commit call in order with its
   encoding; writes to the host that are not commits are outside the
   statement. Look for conditional or variable-length commits that let two
   field tuples serialize to the same bytes. Decode the bytes the way the
   consumer does and confirm field-for-field agreement.

7. **Pin the program.** Find where the verifier gets the image ID or program
   verification key: constant, immutable, governed storage, or caller
   argument. Rebuild the guest at the audited commit with the project's
   reproducible build and compare identifiers. Contract storage and upgrade
   paths route to `onchain-verifier-auditor`.

8. **Check exit and failure paths.** Establish for this zkVM release what a
   guest panic produces (no proof, or a proof with a failure exit code) and
   that the verification call in use rejects anything but success. Find
   guest paths that return early after committing partial values or signal
   failure through a committed flag.

9. **Check proof mode and in-guest verification.** Search configuration,
   environment, and deployment scripts for mock or dev-mode switches
   (`SP1_PROVER=mock`, `RISC0_DEV_MODE`) and mock verifier addresses. For
   proofs verified inside the guest, confirm the program key is constant or
   committed and that the proof type reaching the final verifier has
   discharged the deferred claims (P8).

10. **Hand off.** Fill the output contract per candidate; attach the input
    classification table and the public-values layout.

## Failure Rules

- The workflow is incomplete while any input lacks a class and a code pointer
- A program identifier that cannot be reproduced from the audited source is
  `unverified`, and the rest of the audit is conditional on it
- A mock or dev proof mode reachable in the deployed configuration is a
  candidate without further argument
