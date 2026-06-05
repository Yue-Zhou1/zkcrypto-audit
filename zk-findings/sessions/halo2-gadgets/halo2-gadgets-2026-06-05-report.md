# halo2_gadgets — Cryptographic Audit Report

| | |
|---|---|
| **Engagement** | `halo2-gadgets-2026-06-05` |
| **Target** | `halo2_gadgets` v0.4.0 |
| **Scope** | `/home/zhouy/personal_projects/halo2/halo2_gadgets` (this folder only) |
| **Commit** | `32a87582` (detached HEAD; `zcash/halo2` `main` with OrchardZSA deltas merged) |
| **Date** | 2026-06-05 |
| **Framework** | zkcrypto-audit (router → context → spec-delta → domain auditors → fp-check → report) |
| **Attacker model** | Malicious **prover** seeking a soundness break (under-constrained witnesses); the verifying key, lookup tables, and hash parameters are trusted (fixed at keygen) |
| **Result** | **1 Medium finding (M-1, PoC-confirmed) + 3 Informational notes.** |

> **Update (re-audit of `ecc/chip/mul/incomplete.rs`).** After the initial clean
> pass, a requested deep re-audit of the variable-base scalar-mul incomplete-addition
> code — explicitly *not* assuming safety from prior human audits — surfaced a
> PoC-confirmed **constraint-completeness gap** (finding **M-1**): the
> incomplete-addition gate does not bind the addend to the base point. It is rated
> **Medium** because the deployed Orchard caller pins the result and is unaffected;
> see §4.0 for the finding and the precise impact scope.

---

## 1. Executive Summary

`halo2_gadgets` is the reusable in-circuit gadget/chip library for Halo 2 used by
Zcash Orchard (and, at this commit, the OrchardZSA extension). It provides
constraint-level implementations of Pallas elliptic-curve arithmetic, the
Poseidon (`Pow5`) sponge, the Sinsemilla hash and Sinsemilla-based Merkle CRH, a
SHA-256 gadget, and supporting utilities (lookup range checks, conditional swap,
running-sum decomposition).

The full staged audit flow was executed across all five modules (~20 K LoC of
constraint code). The review prioritized the **deltas introduced by OrchardZSA
relative to the upstream, professionally-audited `zcash/halo2` code**, on the
basis that new optimizations and generalizations are the highest-probability
location for soundness regressions. The two material deltas —
`LookupRangeCheck4_5BConfig` (an optimized 4/5/K-bit lookup) and the Sinsemilla
`allow_init_from_private_point` path — were each analyzed to the constraint
level.

The OrchardZSA deltas themselves are sound: the optimized 4/5-bit lookup correctly
binds witnessed words, and the private-init Sinsemilla path is a documented
caller-obligation shift that is safe for every in-tree caller. The subsequent
re-audit of the (upstream, pre-ZSA) variable-base scalar-mul incomplete addition
found one **Medium** constraint-completeness gap (**M-1**), confirmed with a
compilable PoC, plus three Informational notes.

### Findings overview

| ID | Severity | Title | Property |
|---|---|---|---|
| **M-1** | **Medium** | Variable-base scalar-mul **incomplete-addition addend is not constrained to the base** (PoC-confirmed) | Soundness / constraint completeness (caller-mitigated) |
| INFO-1 | Informational | Sinsemilla `hash_to_point_with_private_init` shifts Q on-curve/domain obligation to the caller | Soundness (caller-dependent) |
| INFO-2 | Informational | Incomplete-addition exceptional case (`x_p = x_a`) enforced at witness time, not at constraint level (by design) | Soundness (by-design) |
| INFO-3 | Informational | Stale `todo!()` unimplemented stubs | Maintainability |

M-1 carries a compilable gate-level PoC (`verify() == Ok` with a forged addend) plus
an end-to-end demonstration that the forged addend corrupts the `mul` output. It is
**not** rated Critical because no *useful* end-to-end forgery against a realistic
caller was demonstrated — the deployed Orchard caller pins the result; see §4.0.

---

## 2. Scope and Methodology

### 2.1 Modules reviewed

| Module | Key files | Focus |
|---|---|---|
| `ecc` | `chip/add.rs`, `add_incomplete.rs`, `witness_point.rs`, `mul/{incomplete,complete,overflow}.rs`, `mul_fixed/*` | Pallas point ops, complete/incomplete addition, variable- and fixed-base scalar mul, scalar canonicity |
| `poseidon` | `pow5.rs`, `poseidon.rs` | `x^5` S-box, full/partial-round gates, MDS, sponge absorb/squeeze/pad |
| `sinsemilla` | `chip.rs`, `chip/hash_to_point.rs`, `chip/generator_table.rs`, `merkle/chip.rs`, `merkle.rs` | Hash gate, generator-table lookup, private-init path, Merkle CRH position/layer binding |
| `sha256` | `table16/*` (gated behind `unstable-sha256-gadget`) | Spread-table construction, compression, message schedule |
| `utilities` | `lookup_range_check.rs`, `cond_swap.rs`, `decompose_running_sum.rs` | Range checks (incl. the new 4/5-bit variant), conditional swap, running-sum decomposition |

### 2.2 Trust boundary

This is a **circuit-construction library**. It holds no secret keys, generates no
randomness, and runs no verifier equation of its own (the proof system lives in
`halo2_proofs`, out of scope). Consequently the only in-scope security property
is **constraint soundness**: every gate must admit only the witness values it is
intended to. Privacy, key authentication, replay, transcript/Fiat-Shamir
soundness, constant-time behavior, and zeroization are **not applicable** at this
layer and were confirmed out of scope.

### 2.3 Parameter provenance (delegated, out of scope)

Cryptographic constants are sourced from dependency crates and were treated as
trusted parameter sources, not re-derived here:

- Poseidon round constants / MDS / inverse-MDS / padding / initial-capacity →
  `halo2_poseidon`.
- Sinsemilla `S_PERSONALIZATION`, `K`, and the `SINSEMILLA_S` generator table →
  the external `sinsemilla` crate.
- SHA-256 `ROUND_CONSTANTS` / `IV` are the standard FIPS 180-4 constants, defined
  in-folder and publicly verifiable.

The chips were verified to *wire* these parameters correctly.

### 2.4 OrchardZSA deltas vs. upstream

Git history shows the in-scope changes relative to upstream `zcash/halo2` are:

1. **`LookupRangeCheck4_5BConfig`** — a new optimized lookup supporting 4-, 5-,
   and K-bit range checks via a `table_range_check_tag` column.
2. **Sinsemilla `allow_init_from_private_point`** /
   `hash_to_point_with_private_init` — initializing the Sinsemilla accumulator
   from a private (witnessed) point instead of only a fixed public domain `Q`.
3. **`Lookup` type-parameter genericization** threaded through the `ecc` and
   `sinsemilla` chips so they can be instantiated with either lookup config. This
   is a purely structural change; **no gate polynomial logic was altered** by it.

Items (1) and (2) received constraint-level analysis (below). Item (3) was
confirmed to preserve the `[0, 2^10)` range guarantee for both lookup
configurations and to leave all gate polynomials byte-for-byte equivalent to the
upstream-audited versions.

---

## 3. Soundness Analysis of the OrchardZSA Deltas

### 3.1 `LookupRangeCheck4_5BConfig` is sound

**Hypothesis investigated.** The optimized lookup multiplexes three modes
(running-sum word, generic short word, and tagged 4/5-bit word) into a single
`meta.lookup` via selector arithmetic. A multiplexed lookup is a classic place
for an under-constraint: a selector combination that lets an out-of-range value
satisfy the lookup.

**Analysis.** The lookup emits two tuples, matched against
`(table_idx, table_range_check_tag)`:

```
input_idx = (1 - q_rc)·(running_sum_word + short_word) + q_rc·z_cur
input_tag = q_rc·num_bits
where  q_rc      = 1 - (1 - q4)(1 - q5)
       num_bits  = 5·q5 + (1 - q5)·q4·4
```

The table load (`lookup_range_check.rs:687-779`) populates:

- `tag = 0` for `table_idx ∈ [0, 2^10)` (every generator row);
- `tag = 4` **only** for `index < 2^4` (so `table_idx ∈ [0, 16)`);
- `tag = 5` **only** for `index < 2^5` (so `table_idx ∈ [0, 32)`).

Enumerating every selector state on a `q_lookup = 1` row:

| Mode | Selectors | Tuple | Constraint on `z_cur` / word |
|---|---|---|---|
| 4-bit | `q4=1, q5=0` (set by `short_range_check`) | `(z_cur, 4)` | satisfiable iff `z_cur ∈ [0, 2^4)` |
| 5-bit | `q5=1` | `(z_cur, 5)` | satisfiable iff `z_cur ∈ [0, 2^5)` |
| running-sum | `q_running=1` | `(word, 0)` | `word ∈ [0, 2^10)` |
| generic short | none of the above | `(z_cur, 0)` | `z_cur ∈ [0, 2^10)` (plus the bitshift gate) |

There is **no** `q_lookup = 1` row that escapes a range constraint, and the
`q_range_check_4` / `q_range_check_5` selectors are **fixed columns** assigned
deterministically by `short_range_check` (they are not prover-controlled and
cannot both be 1 on a 4/5-bit row). The tag binding therefore forces
`z_cur < 2^num_bits` exactly as intended.

**Verdict (crypto-fp-check): FALSE POSITIVE for a soundness bug — the
construction is sound.** It failed the Phase-2 "prove the trigger path" gate: no
attacker-reachable selector combination admits an out-of-range value.

### 3.2 Sinsemilla private-init — see INFO-1

The `allow_init_from_private_point` path was analyzed and is safe for all in-tree
callers; it is documented as INFO-1 below because it shifts a precondition onto
downstream integrators.

### 3.3 Variable-base scalar-mul canonicity (overflow check) — unchanged and sound

`ecc/chip/mul/overflow.rs` implements the canonical "decompose
`s = α + k₂₅₄·2¹³⁰`, then verify `z₁₃₀` and `s_minus_lo_130`" canonicity test
from the Halo 2 book, enforcing that the 255-bit decomposition represents a
scalar `< q`. The only ZSA change is that the helper now accepts a generic
`Lookup` config; the decomposition still uses thirteen 10-bit lookups, each of
which the 4/5B config constrains to `[0, 2^10)` (§3.1). No gate logic changed and
the canonicity constraints are intact.

---

## 4.0 M-1 — Variable-base scalar-mul incomplete-addition addend is not constrained to the base point

**Severity:** Medium (constraint-completeness / soundness; caller-mitigated)
**Impacted property:** Soundness — the gadget does not self-certify `result = [α]·base`
**Component:** `src/ecc/chip/mul/incomplete.rs` (`DoubleAndAdd` gate +
`Config::double_and_add`), within `src/ecc/chip/mul.rs` (`Config::assign`)
**Provenance:** original upstream `zcash/halo2` (predates ZSA; git `cb819e47`,
`5ed3d250`) — *not* introduced by the OrchardZSA deltas
**PoC:** `halo2_gadgets/tests/incomplete_addend_binding_poc.rs` (standalone)

### Investigation notes / hypothesis

The variable-base scalar-mul double-and-add loop computes
`Acc_{i-1} = (Acc_i + P_i) + Acc_i` where the addend `P_i = (x_P, (2k_i−1)·y_P)` is
supposed to be the fixed base point `T`. The hypothesis: are the addend cells
`(x_P, y_P)` actually constrained to equal `T`?

### Technical root cause

`incomplete::Config::double_and_add` writes the addend coordinates with
**`region.assign_advice` (value only)** at `incomplete.rs:309-310`, **never**
`copy_advice`. In `incomplete::Config::configure` only the `z` and `lambda_1`
columns are equality-enabled (`incomplete.rs:84-85`); the `x_p`/`y_p` columns are
not copy-constrained to the base. Within the loop, the only constraints on the
addend are the cross-row constancy checks `x_p_check`/`y_p_check` (`incomplete.rs:199-200`),
which force the addend to be **constant** across the loop but do **not** tie it to
the real base.

The surrounding `mul` region binds the real base `T` in three places — the `[2]T`
initialisation (`add(base_point, base_point)`), the complete-addition phase
(`complete.rs:152,179`), and the LSB step (`mul.rs:351-354`) — but **none of these
reach the incomplete-addition addend rows**. A degrees-of-freedom count confirms it:
per loop row the system `{gradient_1, secant_line, gradient_2}` (3 equations) is
absorbed by the 3 fresh unknowns `{λ1_i, λ2_i, x_{A,i-1}}`, and the `q_mul_1` init
is a single equation absorbed by the first row's fresh `λ`s — leaving the global
constants `(x_P, y_P)` **unconstrained** (2 free DOF).

### Invariant violated

The gadget's intended invariant — *"the returned point equals `[scalar]·base`"* — is
not enforced by the gadget's own constraints. A satisfying assignment exists in which
the incomplete-addition addend is a forged constant `P ≠ base`, producing a result
that is not `[scalar]·base`.

### Trigger path & exploitability

A malicious prover targeting the fixed constraint system assigns the incomplete-loop
`x_p`/`y_p` cells to a forged constant `P ≠ base`. Because the incomplete-addition
exceptional case (`x_{A,i} = x_P`) occurs only with negligible probability over the
scalar, the forged chain runs to completion (empirically, a random `P` threads ≥30
steps without collision in 60/60 Pallas trials), yielding
`Acc_3 = double-add([2]base, P, …) ≠ [bits]·base`; the complete phase then continues
from the forged `Acc_3` with the real base.

**Exploitability is gated on the caller.** Orchard's use (`[ivk]·g_d`) and every
in-tree `mul` test (`mul.rs:523-529`) `constrain_equal` the *result* against an
independently-derived point, which makes a forged (wrong) result **unsatisfiable**.
Those callers are therefore **not** exploitable. The gap is realised only if a
downstream consumer uses `mul`'s output **without** independently pinning it. The
gadget does not document this as a caller obligation.

### Verification artifacts (PoC)

`tests/incomplete_addend_binding_poc.rs` reconstructs the **exact** incomplete-addition
gate (polynomials copied verbatim) and pins the accumulator start to `[2]T` as
constants (a strictly stronger anchor than the real copy from `[2]T`):

| Test | Result | Meaning |
|---|---|---|
| `honest_base_is_accepted_control` | `verify() == Ok` | addend = `T` accepted (control) |
| `forged_addend_is_accepted_demonstrates_underconstraint` | **`verify() == Ok`** | addend forged to `[7]T ≠ T` is **accepted** → gate does not bind the addend |
| `corrupted_witness_is_rejected_gate_is_live` | `verify() == Err(ConstraintNotSatisfied)` | corrupting `λ2` is rejected → the reconstructed gate is **live**, ruling out a no-op gate |

An additional end-to-end experiment drove the **real** `EccChip::mul` via a temporary
test-only hook that forged the addend value: synthesis reached the `#[cfg(test)]`
debug assertion at `mul.rs:271` (`real_mul == result`) and panicked, which (a)
**confirms the forged addend corrupts the `mul` output**, and (b) shows the only thing
that "noticed" the forgery in the full path is a **test-only** assertion, not a
production circuit constraint. (The hook was reverted; only the standalone PoC remains.)

### Why Medium and not Critical

Per the framework PoC rule, a Critical/soundness rating requires an executable
demonstration of a *useful* end-to-end forgery. The PoC proves the **gate-level
under-constraint** and that it **corrupts the output**, but every realistic in-tree
caller pins the result and is unaffected, and no PoC of an unpinned real caller was
produced. The finding is therefore a **constraint-completeness / misuse-prone-API**
gap (Medium): soundness of `[scalar]·base` rests on an *unstated* caller obligation.

### Remediation direction

Either:
1. **Bind the addend in-circuit** — copy-constrain the incomplete-addition `x_p`/`y_p`
   cells to `base.x`/`base.y` (use `copy_advice` instead of `assign_advice` at
   `incomplete.rs:309-310`, enabling equality on those columns), accepting the extra
   permutation cost; or
2. **Document the contract** — state on `EccInstructions::mul` that the returned point
   is guaranteed to equal `[scalar]·base` only when the caller binds the result, and
   confirm all in-tree callers comply.

A maintainer review is warranted to determine which of these reflects the intended
design. This is an internal-circulation finding, not a disclosed Orchard break.

---

## 4. Informational Notes

### INFO-1 — Sinsemilla `hash_to_point_with_private_init` shifts the Q on-curve / domain obligation to the caller

**Severity:** Informational
**Impacted property:** Soundness (caller-dependent; safe in-tree)
**Components:** `sinsemilla/chip.rs:225-240` (the "Initial y_Q" gate),
`sinsemilla/chip/hash_to_point.rs:72-214` (`hash_message_with_private_init`,
`private_q_initialization`)

**Investigation notes.** Upstream Sinsemilla always initializes the hash
accumulator from a **fixed, domain-separated public point** `Q = HashDomains::Q()`.
The ZSA delta adds a path that initializes from a **witnessed**
`NonIdentityEccPoint`. The hypothesis was that a prover able to choose `Q`
adversarially could break domain separation or forge a hash/commitment.

When `allow_init_from_private_point` is set, the "Initial y_Q" gate reads the
y-coordinate from the advice column `x_p` at `Rotation::prev()` and enforces only
`2·y_q − Y_A = 0`; the coordinates of `Q` are brought in via `copy_advice` from
the caller's `NonIdentityEccPoint`. **The chip does not itself constrain `Q` to be
on-curve or domain-bound** — it relies on `Q` already being a constrained
in-circuit point.

**Root cause.** A security precondition (the legitimacy of `Q`) is enforced by the
*caller*, not locally by the chip.

**Exploitability.** Every in-tree caller —
`sinsemilla.rs:358`, `sinsemilla.rs:461` (`CommitDomain::hash_with_private_init`),
and `sinsemilla/merkle/chip.rs:576` — passes a `Q` that is itself the constrained
output of a prior in-circuit Sinsemilla hash (hence on-curve and domain-bound).
The entry points are additionally gated by `allow_init_from_private_point`,
returning `Error::IllegalHashFromPrivatePoint` otherwise. **The attacker-control
gate therefore fails for all code in this crate**, making this a FALSE POSITIVE
for a soundness vulnerability *here*.

**Why it is still worth recording.** The safety of this API is not self-contained:
a future or downstream caller that feeds an unconstrained/raw-witness `Q` (e.g. a
point not produced by an on-curve-checked witness) would lose the domain-binding
guarantee. The obligation is currently expressed only in prose.

**Remediation direction.** Document the caller obligation on
`hash_to_point_with_private_init` / `hash_with_private_init` explicitly ("`Q` MUST
be a point already constrained on-curve and bound to the intended domain, e.g. the
output of a prior in-circuit hash"), or, defensively, route private-init `Q`
through `witness_point.point_non_id` (on-curve enforcement) at the boundary.

---

### INFO-2 — Incomplete-addition exceptional case is enforced at witness time, not at the constraint level (by design)

**Severity:** Informational
**Impacted property:** Soundness (by-design; established upstream)
**Components:** `ecc/chip/mul/incomplete.rs`, `ecc/chip/add_incomplete.rs`,
`sinsemilla/chip/hash_to_point.rs` (`hash_piece`)

> **Distinct from M-1.** INFO-2 concerns the `x_{A,i} = x_P` *exceptional-case*
> handling (a known, by-design property whose soundness follows from the
> completeness theorem). **M-1** is a different and stronger finding about the same
> file: the addend `(x_P, y_P)` is not constrained to equal the base at all. M-1
> supersedes any implication that `incomplete.rs` is fully constrained.

**Investigation notes.** Incomplete addition is unsound on its exceptional inputs
(`x_p = x_a`, or an operand at infinity): when `x_a = x_p`, the `gradient_1`
constraint degenerates and leaves `λ₁` free. In this code the exceptional case is
rejected **only** at witness-assignment time via `error_if_known_and(...)`; that
is a synthesis-time guard, not a circuit constraint.

**Why it is not a vulnerability.** This is the documented, upstream-audited Zcash
design. Soundness is established at the composition level, not per-gate: the
variable-base scalar-mul splits the scalar so that incomplete addition only runs
on bit ranges where the accumulator and base provably cannot collide, and
Sinsemilla deliberately uses incomplete addition because a collision implies a
non-trivial discrete-log relation that is assumed hard to find (see the Halo 2
book, "Variable-base scalar multiplication" and "Sinsemilla", and
`p.z.cash/proto:merkle-crh-orchard`). No part of this argument is changed by ZSA.

**Remediation direction.** None required. Recorded so that any future change to the
scalar split, the Sinsemilla initialization, or the incomplete-addition call sites
is re-checked against the completeness argument.

---

### INFO-3 — Stale `todo!()` unimplemented stubs

**Severity:** Informational
**Impacted property:** Maintainability
**Components:** `ecc/chip.rs:501`; `ecc/chip/mul_fixed/full_width.rs:134`;
`ecc/chip/mul_fixed/short.rs:130` (`todo!("unimplemented for halo2_gadgets v0.1.0")`)

**Investigation notes.** These `todo!()` / `panic!`-equivalent stubs are reachable
only through specific **circuit-author API misuse** (e.g. invoking an
unimplemented full-width fixed-base multiplication variant with a `Some`
magnitude). The reachability is decided at circuit-construction time and is **not**
influenced by a malicious prover's secret witness, so they are not a proving-time
denial-of-service vector. (Separately confirmed: `#![deny(unsafe_code)]` is
enforced crate-wide; the ~226 `unwrap`/`expect` and ~237 `1<<K` shifts outside
tests all operate on compile-time-constant sizes or circuit-author-fixed shapes,
not prover-controlled lengths.)

**Remediation direction.** Replace stale stubs with a descriptive `unimplemented!`
message or a typed error, and refresh the `v0.1.0` version string. Hygiene only.

---

## 5. Verification Artifacts

- **Cross-checks performed:** `crypto-fp-check` verification gates applied to all
  seven Phase-2 candidates (O-1 … O-7); see
  `halo2-gadgets-2026-06-05.json → fp_check_verdicts`.
- **Differential basis:** ZSA deltas diffed against upstream `zcash/halo2` gate
  logic; only `LookupRangeCheck4_5BConfig`, the Sinsemilla private-init path, and
  the `Lookup` genericization differ. The first was proven sound (§3.1); the
  second is INFO-1; the third changes no gate polynomial.
- **Existing test evidence in-tree (supporting, not author-produced by this
  audit):** `lookup_range_check.rs` carries positive and negative `MockProver`
  tests for the 4/5/K-bit cases, including over-range rejection
  (`short_range_check`), and "against stored circuit" pinned-VK tests; Sinsemilla
  and Merkle have `_with_private_init` stored-circuit tests. These corroborate the
  §3.1 soundness argument but are not a substitute for it.
- **PoC status:** Not applicable — no Critical/High finding was raised, so the
  PoC gate has nothing outstanding.

## 6. Index / Disclosure Suitability

No true-positive vulnerability was found, so there is nothing index-worthy for
`zkbugs-index`. The §3.1 result (4/5-bit tagged lookup soundness argument) and
INFO-1 (private-init caller obligation) are suitable for internal/engineering
circulation and could seed a "verified-sound pattern" note if the organization
tracks those, but neither is a disclosable bug.

## 7. Conclusion

The **OrchardZSA deltas** in `halo2_gadgets` at commit `32a87582` are **sound** under
the malicious-prover model: the optimized 4/5-bit range-check lookup correctly binds
witnessed words to their declared bit length, and the Sinsemilla private-init path is
safe for every in-tree caller.

The requested deep re-audit of the (upstream, pre-ZSA) variable-base scalar-mul
**incomplete addition** produced one **Medium**, PoC-confirmed finding (**M-1**): the
incomplete-addition gate does not constrain the addend to the base point, so the `mul`
gadget does not self-certify `result = [scalar]·base`. This is **caller-mitigated** —
Orchard and all in-tree callers pin the result and are unaffected — and is therefore
*not* a disclosed end-to-end break, but it is a genuine constraint-completeness gap
that merits a maintainer decision (bind the addend in-circuit, or document the caller
obligation). The three Informational notes are documentation/hygiene items.

The re-audit underscores the value of not deferring to prior human audits: a
constraint-completeness gap in heavily-reviewed, long-deployed code was found and
demonstrated with a compilable PoC, while its real-world impact was bounded honestly
rather than over- or under-stated.
