# differential-test-harness-gen Finding Patterns

These are the divergence classes a differential harness surfaces. The
harness produces evidence; `crypto-fp-check` adjudicates.

## D1: Accept/reject split on the same input

- **Signal:** target ACCEPTs an input the reference REJECTs (or vice
  versa).
- **Why it matters:** the target either forges (accepts an invalid
  signature/proof/ciphertext) or over-rejects (interop/DoS). Wycheproof's
  "acceptable"/"invalid" labels flag which direction is the bug.

## D2: Output-value divergence

- **Signal:** same input, different ciphertext/signature/shared-secret/
  hash bytes after spec-permitted canonicalization.
- **Why it matters:** a deterministic scheme (RFC 6979, EdDSA, ML-KEM
  shared secret) must agree byte-for-byte; divergence is a spec
  deviation (e.g., round-3/final mixing).

## D3: Error-vs-reject asymmetry

- **Signal:** one implementation panics/throws where the other cleanly
  rejects.
- **Why it matters:** a panic on attacker-supplied input is a
  denial-of-service candidate even when both "fail".

## D4: Timeout / non-termination divergence

- **Signal:** one implementation hangs or loops on an input the other
  handles.
- **Why it matters:** unbounded rejection loops (e.g., try-and-increment,
  rejection sampling) are algorithmic-complexity DoS candidates.

## D5: Normalization masking (a harness bug, not a target bug)

- **Signal:** the harness reports no divergence because error mapping
  collapsed a real accept/reject difference into one bucket.
- **Why it matters:** false confidence. Review the normalization table
  before trusting a clean run; verify it distinguishes ACCEPT, REJECT,
  ERROR, and TIMEOUT rather than folding them.

## D6: Corpus blind spot

- **Signal:** official vectors pass but the boundary corpus is thin
  (no field-edge, non-canonical, or small-order cases).
- **Why it matters:** the classes with the most historical CVEs are
  exactly the edge cases official vectors under-cover — Wycheproof exists
  because of this.
