# threshold-ecdsa-auditor Checklist

Each item names the construction/version it applies to. GG18, GG20, CGGMP21,
and Lindell-style protocols are NOT interchangeable — a check that is
optional in one is the key-extraction bug in another.

## Paillier modulus validity (GG18, GG20, CGGMP21)

- [ ] Each party's Paillier modulus N carries a proof that N is square-free
      and has no small factors, and every counterparty VERIFIES it.
      (GG18 as originally published omitted the no-small-factor proof; the
      2019/2020 revisions and CGGMP21 Π^fac / Π^mod make it explicit.)
- [ ] N is large enough for the MtA range bounds: N > q^7 (or the paper's
      stated bound for the chosen range-proof slack); q = secp256k1 order.
- [ ] Ring-Pedersen parameters (s, t, N̂) used in CGGMP21 range proofs carry
      their own Π^prm proof, verified per counterparty.
- [ ] Paillier keys are generated fresh per party (no shared or reused
      moduli across parties/deployments).

## MtA / MtAwc (GG18, GG20, CGGMP21 presigning)

- [ ] Both directions of the share conversion carry range proofs: the
      initiator proves its ciphertext encrypts a value in range, the
      responder proves its response value in range (MtA), and MtAwc
      additionally proves consistency with the committed/known share.
- [ ] Range proofs are actually verified — not just parsed. A skipped or
      "TODO" verification is the Alpha-Rays key-extraction class.
- [ ] The Beta' masking value is sampled from the full required interval and
      never reused.
- [ ] Homomorphic operations on Paillier ciphertexts reduce correctly and
      cannot overflow N into a modular wrap that leaks the share
      (mod N vs mod q confusion).

## Key generation (all constructions)

- [ ] Commitment-then-reveal ordering for the key-share contributions
      (hash commitment to the Feldman VSS polynomial before seeing others').
- [ ] Feldman VSS share verification against the published polynomial
      commitments, with points validated on-curve and in the right group.
- [ ] The reconstructed public key is verified consistent across parties.
- [ ] Lindell 2P: the proof of Paillier-encrypted share consistency
      (proof that c_key encrypts x1) is present and verified.

## Signing and presignatures (GG20, CGGMP21)

- [ ] Presignatures (k-share, gamma-share, delta/chi values) are single-use,
      atomically consumed, and never persisted across process restarts in a
      replayable way.
- [ ] Concurrent signing sessions keep independent state; no shared nonce
      material across session IDs (four-round GG20 concurrency attacks).
- [ ] Session identifiers (sid, ssid) bind all round messages; messages from
      one session are rejected in another.
- [ ] The final signature is verified against the group public key before
      release (verify-before-release catches corrupted shares).

## Resharing and rotation

- [ ] Reshare protocol authorizes both the old committee (t-of-n of current
      shares) and defines the new committee explicitly.
- [ ] Old shares are zeroized after successful reshare.
- [ ] Reshare cannot be replayed to roll the committee back.

## Identifiable abort (GG20 §5, CGGMP21 accountability)

- [ ] Blame computation reveals only the already-public transcript values,
      never a share or nonce contribution.
- [ ] An adversary cannot trigger repeated aborts to use the blame path as a
      decryption/leak oracle (each abort must not reveal fresh information
      about honest shares).
