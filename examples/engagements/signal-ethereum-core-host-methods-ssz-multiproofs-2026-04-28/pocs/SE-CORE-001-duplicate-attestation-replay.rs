use alloy_primitives::B256;
use beacon_types::{Attestation, ChainSpec, EthSpec, Fork, MinimalEthSpec};
use bls::SecretKey;
use safe_arith::ArithError;
use std::collections::BTreeMap;
use thiserror::Error;
use z_core::{
    Checkpoint, ConsensusState, DEFAULT_CONFIG, Epoch, Input, RandaoMixIndex, Root, StateReader,
    ValidatorIndex, ValidatorInfo, VerifyError, verify,
};

#[derive(Debug, Error)]
#[error("fake reader error")]
struct FakeReaderError;

impl From<ArithError> for FakeReaderError {
    fn from(_: ArithError) -> Self {
        Self
    }
}

struct FakeReader {
    spec: ChainSpec,
    genesis_validators_root: Root,
    validators: BTreeMap<ValidatorIndex, ValidatorInfo>,
}

impl StateReader for FakeReader {
    type Error = FakeReaderError;
    type Spec = MinimalEthSpec;

    fn chain_spec(&self) -> &ChainSpec {
        &self.spec
    }

    fn genesis_validators_root(&self) -> Result<Root, Self::Error> {
        Ok(self.genesis_validators_root)
    }

    fn fork(&self, epoch: Epoch) -> Result<Fork, Self::Error> {
        Ok(self.spec.fork_at_epoch(epoch))
    }

    fn active_validators(
        &self,
        _epoch: Epoch,
    ) -> Result<impl Iterator<Item = (ValidatorIndex, &ValidatorInfo)>, Self::Error> {
        Ok(self.validators.iter().map(|(idx, validator)| (*idx, validator)))
    }

    fn randao_mix(&self, _epoch: Epoch, _idx: RandaoMixIndex) -> Result<Option<B256>, Self::Error> {
        Ok(Some(B256::ZERO))
    }
}

fn checkpoint(epoch: u64, tag: u8) -> Checkpoint {
    Checkpoint::new(Epoch::new(epoch), B256::repeat_byte(tag))
}

fn consensus_state() -> ConsensusState {
    ConsensusState {
        previous_justified_checkpoint: checkpoint(1, 1),
        current_justified_checkpoint: checkpoint(1, 1),
        finalized_checkpoint: checkpoint(0, 0),
    }
}

#[test]
fn duplicate_attestations_from_one_validator_are_counted_multiple_times() {
    let mut spec = MinimalEthSpec::default_spec();
    spec.electra_fork_epoch = Some(Epoch::new(0));
    spec.target_committee_size = 1;
    spec.max_committees_per_slot = 1;

    let keys = (0..8).map(|_| SecretKey::random()).collect::<Vec<_>>();
    let validators = keys
        .iter()
        .enumerate()
        .map(|(idx, key)| {
            (
                idx,
                ValidatorInfo {
                    pubkey: key.public_key(),
                    effective_balance: spec.max_effective_balance,
                    slashed: false,
                    activation_eligibility_epoch: Epoch::new(0),
                    activation_epoch: Epoch::new(0),
                    exit_epoch: spec.far_future_epoch,
                },
            )
        })
        .collect();
    let reader = FakeReader {
        spec: spec.clone(),
        genesis_validators_root: B256::ZERO,
        validators,
    };

    let source = beacon_types::Checkpoint {
        epoch: Epoch::new(1),
        root: B256::repeat_byte(1),
    };
    let target = beacon_types::Checkpoint {
        epoch: Epoch::new(2),
        root: B256::repeat_byte(2),
    };
    let target_slot = target.epoch.start_slot(MinimalEthSpec::slots_per_epoch());
    let base_attestation = Attestation::<MinimalEthSpec>::empty_for_signing(
        0,
        1,
        target_slot,
        B256::repeat_byte(9),
        source,
        target,
        &spec,
    )
    .unwrap();

    let fork = spec.fork_at_epoch(target.epoch);
    let signed_by_one_validator = keys
        .iter()
        .find_map(|key| {
            let mut attestation = base_attestation.clone();
            attestation
                .sign(key, 0, &fork, B256::ZERO, &spec)
                .unwrap();

            match verify(
                &DEFAULT_CONFIG,
                &reader,
                Input {
                    consensus_state: consensus_state(),
                    attestations: vec![attestation.clone()],
                },
            ) {
                Err(VerifyError::ThresholdNotMet { .. }) => Some(attestation),
                Err(VerifyError::InvalidAttestation("Invalid signature")) => None,
                result => panic!("unexpected verification result while finding signer: {result:?}"),
            }
        })
        .expect("one generated key should occupy committee position 0");

    let post_state = verify(
        &DEFAULT_CONFIG,
        &reader,
        Input {
            consensus_state: consensus_state(),
            attestations: vec![signed_by_one_validator; 7],
        },
    )
    .expect("replayed attestation balance is incorrectly counted toward finality");

    assert_eq!(post_state.finalized_checkpoint, checkpoint(1, 1));
}
