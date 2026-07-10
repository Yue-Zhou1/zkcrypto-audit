// codeX PoC: Byzantine partial signature poisons Anchor threshold reconstruction.
//
// This is a native Rust test body for anchor/common/bls_lagrange/src/blst.rs.
// Reproduction used during the codeX audit:
//
//   1. Paste this test into the #[cfg(test)] mod tests in
//      anchor/common/bls_lagrange/src/blst.rs.
//   2. Run:
//      env -u TARGET_CC -u TARGET_CXX -u CC_x86_64_unknown_linux_gnu \
//          -u CXX_x86_64_unknown_linux_gnu \
//          cargo test -p bls_lagrange poc_codex_cx01_reconstruction_poisoning -- --nocapture
//
// The test passes while the vulnerability exists: one authenticated Byzantine
// operator can contribute a syntactically valid but incorrect BLS share, the
// combine operation returns Ok, and the reconstructed signature fails final
// verification. A correct fix should reject/evict the bad share or verify the
// reconstructed signature before returning it, causing this PoC assertion model
// to fail.

#[test]
fn poc_codex_cx01_reconstruction_poisoning() {
    use bls::Hash256;
    use rand::prelude::*;

    let rng = &mut StdRng::seed_from_u64(0xC0DE_0001);

    let total = 4u64;
    let threshold = 3u64;
    let master = random_key(rng).expect("master key generation");
    let pk = master.public_key();

    let shares = split_with_rng(
        &master,
        threshold,
        (1..=total).map(|x| KeyId::try_from(x).expect("nonzero operator id")),
        rng,
    )
    .expect("key split");

    let mut data = [0u8; 32];
    rng.fill(&mut data);
    let root = Hash256::from(data);

    let ids: Vec<KeyId> = shares[..threshold as usize]
        .iter()
        .map(|(id, _)| id.clone())
        .collect();
    let honest_sigs: Vec<_> = shares[..threshold as usize]
        .iter()
        .map(|(_, sk)| sk.sign(root))
        .collect();

    let good = combine_signatures(&honest_sigs, &ids).expect("honest combine");
    assert!(good.verify(&pk, root), "honest threshold must verify");

    let rogue = random_key(rng).expect("rogue key generation");
    let mut poisoned_sigs = honest_sigs.clone();
    poisoned_sigs[threshold as usize - 1] = rogue.sign(root);

    let poisoned = combine_signatures(&poisoned_sigs, &ids)
        .expect("combine returns Ok because per-share verification is absent");

    assert!(
        !poisoned.verify(&pk, root),
        "poisoned reconstruction must fail final verification"
    );

    let recovered = combine_signatures(&honest_sigs, &ids).expect("recover honest subset");
    assert!(
        recovered.verify(&pk, root),
        "valid shares remain sufficient if the invalid share is evicted"
    );
}
