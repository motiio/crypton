use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

use crate::{id, DONATOR_SEED, MONEY_STORAGE_SEED};

/// There is only one settings account. All counter accounts use it.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct MoneyStorage {
    /// Only admin can change this account
    pub admin: [u8; 32],
}

impl MoneyStorage {
    pub fn get_money_storage_pubkey_with_bump() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[MONEY_STORAGE_SEED.as_bytes()], &id())
    }

    pub fn get_money_storage_pubkey() -> Pubkey {
        let (pubkey, _) = Self::get_money_storage_pubkey_with_bump();
        pubkey
    }

    pub fn is_ok_money_storage_pubkey(settings_pubkey: &Pubkey) -> bool {
        let (pubkey, _) = Self::get_money_storage_pubkey_with_bump();
        pubkey.to_bytes() == settings_pubkey.to_bytes()
    }
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Donator {
    /// Only admin can change this account
    pub user: [u8; 32],
}

impl Donator {
    pub fn get_donator_pubkey_with_bump() -> (Pubkey, u8) {
        Pubkey::find_program_address(&[DONATOR_SEED.as_bytes()], &id())
    }

    pub fn get_donator_pubkey(user: &Pubkey) -> Pubkey {
        Pubkey::create_with_seed(user, DONATOR_SEED, &id()).unwrap()
    }

    pub fn is_ok_donator_pubkey(user: &Pubkey, donator: &Pubkey) -> bool {
        donator.to_bytes() == Self::get_donator_pubkey(user).to_bytes()
    }
}
