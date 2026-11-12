---
name: signature-scheme-auditor
description: >
  Audit classical signature schemes — generic ECDSA across curves, Schnorr/
  BIP-340, EdDSA/Ed25519, RSA-PSS and PKCS#1 v1.5 — for verification-equation
  correctness, malleability, canonical encoding, public-key validation, and
  hash/prehash semantics. Use for standalone signature library review outside
  Ethereum application encoding, BLS, or threshold protocols.
allowed-tools: Read Grep Glob Bash
---

# signature-scheme-auditor

Domain auditor for classical single-party signature schemes: the
verification equations, encodings, and key-validation rules of ECDSA,
Schnorr/BIP-340, EdDSA, and RSA signatures.

## When to Use

- Auditing generic ECDSA signing/verification across ecosystems and curves
  (P-256, secp256k1, brainpool, etc.)
- Reviewing Schnorr and BIP-340 x-only key handling, tagged hashes, and
  verification equations
- Reviewing EdDSA/Ed25519 canonical encoding, cofactor semantics, and
  batch/single verification consistency
- Reviewing RSA-PSS and PKCS#1 v1.5 verification and padding rules
- Assessing malleability, public-key validation, and hash/prehash semantics

## When NOT to Use

- Ethereum-specific EIP-712, ecrecover, or application encoding ->
  `ethereum-crypto-auditor`
- BLS signatures, pairings, aggregation -> `ecc-pairing-auditor`
- Threshold schemes -> `dkg-threshold-auditor` (FROST/MuSig2) or
  `threshold-ecdsa-auditor` (GG/CGGMP)
- Nonce generation/derivation mechanics -> `randomness-auditor`
- Fault-attack resistance of signing hardware paths ->
  implementation-safety skills (verify-after-sign handoff)

## Rationalizations to Reject

| Rationalization | Why it is wrong |
|---|---|
| "The library verifies signatures, so malleability is handled" | Many ECDSA verifiers accept both `(r, s)` and `(r, n - s)`. If the application uses signature bytes as an identifier or replay key, low-s has to be enforced explicitly |
| "Ed25519 is standardized, so every implementation accepts the same signatures" | Implementations differ on non-canonical encodings, small-order points, and cofactored versus cofactorless verification. In a consensus setting that disagreement is the bug |
| "Batch verification is a faster single verification" | Batch and single verification can accept different sets of signatures; a signature valid in one and not the other splits verifiers |
| "The caller hashes the message first" | Check which side hashes and with what. A verify-prehashed API handed an attacker-chosen digest lets the attacker choose the hash, which for ECDSA yields forgeries on digests with no known message |
| "The public key came from our own registry" | It still needs validation. In some schemes an identity or small-order key lets one signature verify for every message (the BLS identity key; small-order Ed25519 keys under verifiers that accept them), and an off-curve point is outside the group the scheme is defined over |
| "PKCS#1 v1.5 verification is parse and compare" | Lenient parsing of the padding or DigestInfo is the Bleichenbacher signature-forgery class. Re-encode the expected message and compare the whole block |

## Core Review Areas

1. Verification equations: exact equation per scheme, all components
   checked (never trusting a library's partial verification)
2. Range and canonicality: ECDSA r,s in [1, n-1]; Ed25519 s < L and
   canonical point encodings; BIP-340 x-only lift and even-y convention;
   PSS salt and v1.5 DigestInfo strictness
3. Malleability: ECDSA (r, s)/(r, n-s); Ed25519 non-canonical s or A;
   scheme-level implications for consumers that key on signature bytes
4. Public-key validation: on-curve, non-identity, correct subgroup (or
   cofactored equation), small-order rejection policy
5. Hash and prehash semantics: which hash, truncation rules
   (FIPS 186-5 leftmost-bits), Ed25519ph/ctx variants, cross-protocol
   hash-domain reuse
6. Batch vs single consistency: batch equations (cofactored) accepting what
   single (cofactorless) rejects, and consensus divergence risk
7. Nonce integration: signing paths call correct derivation (RFC 6979 /
   RFC 8032) — deep RNG review hands off to `randomness-auditor`
8. Verify-after-sign and fault-check posture at the API boundary

## Workflow

### Phase 1: Scheme inventory

- Read `references/signature-scheme-checklist.md`
- Identify every scheme/curve/hash triple in scope and the governing
  standard for each

### Phase 2: Verification-path review

- Execute `workflows/signature-verification-review.md`

### Phase 3: Pattern hunt

- Read `references/finding-patterns.md`
- Prioritize missing range checks, permissive decoders, batch/single
  divergence, and v1.5 parsing tolerance

### Phase 4: Handoff

- Send surviving findings to `crypto-fp-check`
- Cross-route nonce lifecycle to `randomness-auditor`, Ethereum encoding to
  `ethereum-crypto-auditor`, BLS/pairing math to `ecc-pairing-auditor`

## Output Contract

Produce a signature-scheme handoff that includes:

- `signature_family`
- `verification_or_signing_path`
- `equation_or_encoding_invariant`
- `evidence`
- `disposition` (one of `verified`, `false_positive`, `unverified`,
  `observation`, `residual_risk`)
- `next_route`

## Reference Index

- [references/signature-scheme-checklist.md](references/signature-scheme-checklist.md)
- [references/finding-patterns.md](references/finding-patterns.md)
- [references/spec-sources.md](references/spec-sources.md)
- [workflows/signature-verification-review.md](workflows/signature-verification-review.md)
