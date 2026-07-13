# pqc-signature-auditor Checklist

## Version and parameter provenance (all families)

- [ ] The scheme and spec version are pinned: FIPS 204 final (ML-DSA)
      differs from round-3 Dilithium; FIPS 205 final (SLH-DSA) from
      round-3 SPHINCS+ (e.g., ctx parameter, domain-separated prehash
      variants). FN-DSA/Falcon has NO final FIPS as of the source-notes
      date — implementations track the round-3 Falcon spec and must be
      flagged pre-standard.
- [ ] Parameter set matches the claimed category and is not negotiable
      below policy (ML-DSA-44/65/87; SLH-DSA-{SHA2,SHAKE}-{128,192,256}{s,f};
      XMSS/LMS parameter OIDs per SP 800-208).
- [ ] KATs come from final-standard/ACVP vectors.

## ML-DSA (FIPS 204)

- [ ] Rejection sampling implements ALL checks: ||z||_inf < gamma1 - beta,
      ||r0||_inf < gamma2 - beta, hint count <= omega, and (where
      applicable) the ct0 bound — with loop iteration limits per spec.
- [ ] Rejected candidates leak nothing: no timing/trace difference
      proportional to secret-dependent rejection reasons (route
      measurement to `side-channel-auditor`).
- [ ] Signing mode: hedged (default, rnd from RBG) vs deterministic
      (rnd = 0) is an explicit, documented choice; deterministic mode in
      fault-exposed environments is a finding (`residual_risk` minimum).
- [ ] The ctx context string (max 255 bytes) is bound as specified; the
      prehash variants (HashML-DSA) use the domain-separated encoding.
- [ ] Verification enforces the z bound, hint weight limit, and encoding
      canonicality before accepting.

## SLH-DSA (FIPS 205)

- [ ] ADRS addressing: every hash call uses the correct address type and
      counters; address reuse across FORS/WOTS+/tree layers collapses
      one-timeness.
- [ ] WOTS+ checksum computed and verified per spec — a missing checksum
      check admits message forgery within a chain.
- [ ] FORS: message-to-indices mapping exact; revealed FORS keys per
      signature counted against the parameter set's security budget.
- [ ] opt_rand: hedged variant uses fresh randomness; deterministic
      (opt_rand = PK.seed) documented, with fault posture assessed.
- [ ] No secret-dependent branching in hash tree computations.

## FN-DSA / Falcon (pre-standard)

- [ ] Standardization status pinned in the report: FIPS 206 draft status
      as of the review date; deviations between deployed Falcon and the
      eventual standard are a tracked risk.
- [ ] Gaussian sampler: the discrete Gaussian (SamplerZ) is the attack
      surface — verify it matches the reference constant-time design;
      floating-point timing variability is a known key-recovery vector.
- [ ] Verification enforces the signature norm bound (beta^2) and
      canonical encodings.

## XMSS / LMS / HSS (NIST SP 800-208)

- [ ] OTS index is a monotonic counter persisted ATOMICALLY BEFORE any
      signature bytes leave the signer (write-ahead, fsync'd); a crash
      after release but before persist must be impossible by
      construction.
- [ ] Crash recovery skips forward (burns indices), never re-derives the
      last index.
- [ ] Backup/restore procedures cannot roll the counter back: restoring a
      signer image restores an OLD index — SP 800-208 requires the key be
      unusable after restore or the state externally reserved (index
      reservation windows).
- [ ] Cloning/replication: at most one active signer per key; HA designs
      partition index space (HSS subtree assignment) rather than sharing
      a counter.
- [ ] SP 800-208 hardware-binding: private keys generated and used inside
      a validated cryptographic module; export of the raw private key
      (which contains the index) is prohibited.
- [ ] Remaining-capacity monitoring: signing halts before index
      exhaustion; exhaustion handling cannot wrap.

## Cross-cutting

- [ ] Signing randomness lifecycle (hedged rnd, opt_rand) routes to
      `randomness-auditor` for fork/snapshot/persistence review.
- [ ] Private-key zeroization and encoding hygiene route to
      `rust-crypto-safety` (or the language-appropriate skill).
