// PoC: Byzantine partial-signature poisons threshold reconstruction (SD-1 / OF-1 / OF-3)
//
// Demonstrates that anchor's `bls_lagrange::combine_signatures` reconstructs a WRONG
// aggregate when a single participant in the threshold set contributes an invalid
// partial signature, and that anchor never verifies partial signatures against share
// public keys (the SSV spec's FallBackAndVerifyEachSignature) nor re-verifies the
// reconstructed signature before returning it (signature_collector::signature_collector).
//
// This test is written against the DEFAULT (blst) backend and belongs in
// anchor/common/bls_lagrange/src/blst.rs `mod tests`. To reproduce, paste the test
// body below into that module and run:
//
//     cd anchor/common/bls_lagrange
//     cargo test poc_reconstruction_poisoning -- --nocapture
//
// Expected result: the assertions below all hold, i.e.
//   * the all-honest threshold combines to a signature that verifies, and
//   * swapping ONE honest partial for a garbage one yields a reconstruction that
//     FAILS verification, with combine_signatures returning Ok (no per-share check).

#[test]
fn poc_reconstruction_poisoning() {
    use bls::Hash256;
    use rand::prelude::*;

    let rng = &mut StdRng::seed_from_u64(0xB16B00B5);

    // 4-node committee: n = 3f+1 with f = 1, threshold t = 2f+1 = 3.
    let total = 4u64;
    let threshold = 3u64;

    let master = random_key(rng).unwrap();
    let pk = master.public_key();

    let shares = split_with_rng(
        &master,
        threshold,
        (1..=total).map(|x| KeyId::try_from(x).unwrap()),
        rng,
    )
    .unwrap();

    let mut data = [0u8; 32];
    rng.fill(&mut data);
    let root = Hash256::from(data);

    // Honest partial signatures from the first `threshold` shares.
    let ids: Vec<KeyId> = shares[..threshold as usize]
        .iter()
        .map(|(id, _)| id.clone())
        .collect();
    let honest_sigs: Vec<_> = shares[..threshold as usize]
        .iter()
        .map(|(_, sk)| sk.sign(root))
        .collect();

    // 1) All-honest reconstruction verifies.
    let good = combine_signatures(&honest_sigs, &ids).unwrap();
    assert!(
        good.verify(&pk, root),
        "sanity: honest threshold must reconstruct a valid signature"
    );

    // 2) One Byzantine operator submits a partial signature made with a key that is
    //    NOT its real share (garbage that still passes the RSA envelope / SSZ decode).
    let rogue = random_key(rng).unwrap();
    let mut poisoned_sigs = honest_sigs.clone();
    poisoned_sigs[threshold as usize - 1] = rogue.sign(root);

    // combine_signatures does NOT verify individual partials against share pubkeys:
    // it returns Ok with a corrupted aggregate.
    let poisoned = combine_signatures(&poisoned_sigs, &ids)
        .expect("combine returns Ok — no per-share verification is performed");

    // 3) The reconstructed signature is invalid, yet anchor's signature_collector would
    //    cache and return it without ever calling this verify().
    assert!(
        !poisoned.verify(&pk, root),
        "poisoned reconstruction must NOT verify — the validator duty fails at the beacon node"
    );

    // 4) The SSV spec recovers by evicting the bad share and recombining the honest 2f+1.
    //    Anchor omits that fallback, so a single malicious operator among the first
    //    `threshold` responders persistently denies the duty. We show the recovery the
    //    spec would perform is available but unused:
    let recovered = combine_signatures(&honest_sigs, &ids).unwrap();
    assert!(
        recovered.verify(&pk, root),
        "the honest subset would reconstruct correctly IF anchor verified+evicted like the spec"
    );

    println!("PoC OK: single Byzantine partial poisons reconstruction; no per-share verify, no fallback");
}
