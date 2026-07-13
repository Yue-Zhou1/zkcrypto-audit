# STARK / AIR Finding Patterns

Generic STARK and AIR review patterns for verifiers outside Cairo/Starknet
(Winterfell, plonky3-based STARKs, miden-style VMs' proof layers, custom AIR
verifiers). Cairo language/hint review stays with `cairo-auditor`; FRI as a
standalone PCS stays with `commitment-scheme-auditor` — this file covers the
STARK protocol layer that composes them.

## A1: Incomplete AIR transition or boundary constraints

- **Pattern:** a trace column updated by the prover has no transition
  constraint covering one of its update cases, or boundary constraints pin
  only the first/last row of some registers.
- **Impact:** a malicious prover fills the unconstrained rows/cases with
  arbitrary values — the STARK twin of an unconstrained circom signal.
- **Where:** hand-written AIRs, especially selector-guarded optional
  updates and "padding" rows.

## A2: Trace padding and selector abuse

- **Pattern:** the trace is padded to a power of two with rows that
  disable constraints via selectors, but the selector column itself is not
  constrained to the intended shape (e.g., monotone 1->0).
- **Impact:** the prover turns constraints off inside the "real" region.

## A3: Degree-bound accounting errors

- **Pattern:** the declared composition degree bound does not match the
  actual max constraint degree times selector/periodic factors; blowup
  factor chosen for the wrong degree.
- **Impact:** composition polynomial exceeds the tested degree — low-degree
  testing no longer binds the constraints; soundness collapses silently.

## A4: Composition/quotient construction errors

- **Pattern:** constraint composition coefficients not drawn from the
  transcript after trace commitment, vanishing polynomial excludes
  exemption points incorrectly, or the quotient is checked at too few
  points.
- **Impact:** forged traces satisfy the composition check with
  non-vanishing constraint residues.

## A5: FRI query schedule and soundness budget

- **Pattern:** number of FRI queries, blowup factor, and grinding bits
  jointly deliver fewer soundness bits than the protocol claims; queries
  sampled before the last commitment, or reused across layers without
  fresh transcript state.
- **Impact:** provable-forgery probability far above the advertised
  2^-lambda; grinding lets an attacker brute-force favorable challenges.

## A6: DEEP / out-of-domain sampling gaps

- **Pattern:** the out-of-domain (OOD) point is drawn before all trace and
  composition commitments are absorbed, or OOD consistency between the
  trace openings and composition openings is not checked.
- **Impact:** the DEEP consistency check no longer binds the committed
  trace to the composition polynomial — classic transcript-ordering
  soundness break.

## A7: Public-input binding gaps

- **Pattern:** public inputs enter boundary constraints but are not
  absorbed into the transcript before challenges, or only a hash of a
  caller-controlled encoding is bound.
- **Impact:** proof replay across different public inputs, or
  proof-for-statement-A accepted as proof-for-statement-B.

## A8: Verifier-side domain/root mismatches

- **Pattern:** verifier recomputes evaluation domains, generators, or
  Merkle roots with parameters that can drift from the prover's
  (hard-coded vs proof-supplied parameters).
- **Impact:** parameter-substitution attacks: the prover supplies
  parameters the verifier trusts without checking against the protocol
  definition.
