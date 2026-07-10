# wycheproof-replay.md

Executable workflow for building a differential harness and replaying
test vectors. This skill is user-triggered; run it only when a reviewer
asks for differential evidence.

1. **Scope.** Read `references/differential-test-checklist.md`. Fix the
   primitive, the target entry point and version, and the reference
   implementation(s) with pinned versions.

2. **Select vector sources.** Choose the applicable corpora:
   Wycheproof for the primitive (if covered), CAVP/ACVP for FIPS
   algorithms, RFC vectors for RFC schemes. Supplement with a generated
   boundary corpus (field edges, non-canonical encodings, wrong lengths,
   small-order points, malformed padding).

3. **Define the verdict normalization.** Write the mapping from each
   implementation's raw outcome to {ACCEPT, REJECT, ERROR, TIMEOUT} and,
   for output-producing operations, the byte-comparison after only
   spec-permitted canonicalization. Confirm the mapping does not collapse
   a real accept/reject split (D5).

4. **Generate the harness.** Emit a hermetic harness (pinned toolchain,
   seeded RNG, no network) that feeds each vector to every implementation,
   records the normalized verdict and any output bytes, and diffs them.
   Use derandomized/KAT entry points for randomized schemes.

5. **Replay and record.** Run the harness. For every divergence, capture:
   the input, each implementation's verdict/output, and the Wycheproof
   label (if any). Save a versioned corpus of diverging inputs.

6. **Emit reproduction commands.** For each divergence, produce a
   standalone command that reruns just that input against both
   implementations.

7. **Package the handoff.** Fill the output contract:
   `implementations_compared`, `vector_or_corpus_source`,
   `normalization_rules`, `reproduction_command`, `evidence_artifacts`
   (corpus paths, logs), and `next_route` (`crypto-fp-check` for
   candidate divergences). Note which divergences are spec-permitted and
   which are candidate findings — but leave severity to `crypto-fp-check`.
