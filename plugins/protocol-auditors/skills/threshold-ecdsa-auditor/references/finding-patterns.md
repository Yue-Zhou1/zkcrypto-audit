# threshold-ecdsa-auditor Finding Patterns

## P1: Missing or unverified MtA range proofs (Alpha-Rays class)

- **Pattern:** MtA implementation constructs range proofs but a counterparty
  skips verification, or the protocol config disables them ("fast mode").
- **Root cause:** range proofs are the expensive part of GG18/GG20; they get
  stubbed during development and never re-enabled.
- **Impact:** full private-key extraction by a single malicious participant
  after a small number of signing sessions (Alpha-Rays, Verichains
  "TSSHOCK" reports against GG18/GG20 implementations).
- **Where:** tss-lib forks, multi-party-ecdsa forks, "optimized" MtA paths.

## P2: Paillier modulus without validity proof

- **Pattern:** parties accept counterparty Paillier keys with no
  square-free/no-small-factor proof (Π^mod, Π^fac in CGGMP21).
- **Impact:** a malicious modulus with small factors turns MtA responses
  into a CRT-based leak of honest parties' secrets.

## P3: Presignature reuse / non-atomic consumption

- **Pattern:** presignature pool marks entries used AFTER releasing the
  partial signature; crash or race replays a presignature with a second
  message.
- **Impact:** two signatures sharing k reveal the key share (standard
  ECDSA nonce-reuse algebra lifted to shares).

## P4: Concurrent-session state bleed

- **Pattern:** global mutable round state keyed only by peer, not by
  session ID; interleaved signing sessions mix nonce contributions.
- **Impact:** cross-session algebraic relations leak shares; also enables
  signature forgery on unapproved messages.

## P5: Commitment-ordering violation in keygen

- **Pattern:** a party can see others' VSS polynomial commitments before
  publishing its own (missing or non-binding hash commitment round).
- **Impact:** rogue-key-style bias of the aggregate public key.

## P6: Abort-path oracle

- **Pattern:** identifiable-abort blame logic decrypts or reveals round
  secrets to prove misbehavior; attacker triggers aborts repeatedly.
- **Impact:** incremental leakage of honest key shares across aborts.

## P7: mod N / mod q confusion in share conversion

- **Pattern:** additive shares reduced mod N (Paillier plaintext space) are
  later treated as values mod q without the wraparound accounting the paper
  requires.
- **Impact:** signing failures at best; at worst a bias measurable across
  signatures that supports lattice attacks on the key.

## P8: Reshare rollback or unauthorized committee change

- **Pattern:** reshare messages not bound to a monotonic epoch; an old
  committee's reshare transcript can be replayed.
- **Impact:** revoked members regain signing power.
