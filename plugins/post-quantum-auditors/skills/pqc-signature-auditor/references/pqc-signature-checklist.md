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
      XMSS/LMS parameter-set identifiers approved in SP 800-208).
- [ ] KATs come from final-standard/ACVP vectors.

## ML-DSA (FIPS 204)

- [ ] Rejection sampling implements ALL checks: ||z||_inf < gamma1 - beta,
      ||r0||_inf < gamma2 - beta, ||ct0||_inf < gamma2, and hint count
      <= omega (Algorithm 7). Appendix C recommends no loop bound; if one
      is used it is at least 814 iterations and, on exhaustion, signing
      returns a constant error and destroys intermediate values.
- [ ] Rejected candidates are never released, and the norm checks leak
      nothing secret-dependent: the Dilithium reference code exits on the
      first violating coefficient (its position is independent of the
      secret) but must not leak the sign of the centered value (route
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
      counters; address reuse across FORS/WOTS+/tree layers removes the
      domain separation between hash calls and, for the WOTS_PRF and
      FORS_PRF addresses, makes distinct one-time secrets coincide.
- [ ] WOTS+ checksum digits computed per spec in both signing and
      public-key recovery from a signature (§5.2, §5.3) — omitting the
      checksum chains admits forgery by advancing message-digit chains.
- [ ] FORS: message-to-indices mapping exact; total signatures per key
      stay within the 2^64 limit the parameter sets are designed for
      (§11).
- [ ] opt_rand: hedged variant uses fresh randomness (addrnd);
      deterministic (opt_rand = PK.seed) documented, with fault posture
      assessed (randomized signing alone does not stop the grafting-tree
      fault attack).
- [ ] No secret-dependent branching in hash tree computations.

## FN-DSA / Falcon (pre-standard)

- [ ] Standardization status pinned in the report: FIPS 206 publication
      status as of the review date; deviations between deployed Falcon
      and the eventual standard are a tracked risk.
- [ ] Gaussian sampler: the discrete Gaussian (SamplerZ) is the attack
      surface — verify it matches the reference isochronous design;
      sampler timing leakage and floating-point discrepancies between
      two runs on the same input are known key-recovery vectors.
- [ ] Verification enforces the signature norm bound
      (||(s1, s2)||^2 <= floor(beta^2)) and canonical encodings.

## XMSS / LMS / HSS (NIST SP 800-208)

- [ ] OTS index is a monotonic counter persisted ATOMICALLY BEFORE any
      signature bytes leave the signer (write-ahead, fsync'd); a crash
      after release but before persist must be impossible by
      construction.
- [ ] Crash recovery skips forward (burns indices), never re-derives the
      last index.
- [ ] Backup/restore procedures cannot roll the counter back: restoring a
      signer image restores an OLD index. SP 800-208 §8.1 forbids
      exporting private keying material at all, so a conforming module
      has no private-key backup to restore; redundancy comes from
      distributed multi-tree keys (§7). Outside a conforming module, a
      restored key must be unusable or resume past every index that
      could have been used (index reservation windows).
- [ ] Cloning/replication: at most one active signer per key; HA designs
      partition index space (HSS subtree assignment) rather than sharing
      a counter.
- [ ] SP 800-208 hardware-binding (§8.1): private keys generated and used
      inside a hardware cryptographic module validated to FIPS 140-2 or
      140-3 Level 3 or higher physical security; export of private keying
      material (which contains the index) is prohibited, even encrypted.
- [ ] Remaining-capacity monitoring: signing halts before index
      exhaustion; exhaustion handling cannot wrap.

## Cross-cutting

- [ ] Signing randomness lifecycle (hedged rnd, opt_rand) routes to
      `randomness-auditor` for fork/snapshot/persistence review.
- [ ] Private-key zeroization and encoding hygiene route to
      `rust-crypto-safety` (or the language-appropriate skill).
