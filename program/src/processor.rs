use crate::instruction::ProgramInstruction;
use crate::state::{Donator, MoneyStorage};
use crate::{id, DONATOR_SEED, MONEY_STORAGE_SEED};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::program_error::ProgramError;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    program::invoke_signed,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
pub struct Processor;

impl Processor {
    pub fn process(_program_id: &Pubkey, accounts: &[AccountInfo], input: &[u8]) -> ProgramResult {
        let instruction = ProgramInstruction::try_from_slice(input)?;
        match instruction {
            ProgramInstruction::Donate { amount } => Self::donate(accounts, amount),
            ProgramInstruction::Withdraw => Self::withdraw(accounts),
        }
    }

    fn donate(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
        let acc_iter = &mut accounts.iter();
        let transfer_from = next_account_info(acc_iter)?;
        let money_storage_info = next_account_info(acc_iter)?;
        let donator_info = next_account_info(acc_iter)?;
        let rent_info = next_account_info(acc_iter)?;
        let system_program_info = next_account_info(acc_iter)?;

        if !transfer_from.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let (money_storage_pubkey, money_storage_bump_seed) =
            MoneyStorage::get_money_storage_pubkey_with_bump();
        if money_storage_pubkey != *money_storage_info.key {
            return Err(ProgramError::InvalidArgument);
        }

        if !Donator::is_ok_donator_pubkey(transfer_from.key, donator_info.key) {
            return Err(ProgramError::InvalidArgument);
        }

        // Inicialize Money Storage PDA
        if money_storage_info.data_is_empty() {
            msg!("Creating Money Storage account");
            let money_storage = MoneyStorage {
                admin: transfer_from.key.to_bytes(),
            };
            let space = money_storage.try_to_vec()?.len();
            let rent = &Rent::from_account_info(rent_info)?;
            let lamports = rent.minimum_balance(space);
            let signer_seeds: &[&[_]] =
                &[MONEY_STORAGE_SEED.as_bytes(), &[money_storage_bump_seed]];
            invoke_signed(
                &system_instruction::create_account(
                    transfer_from.key,
                    &money_storage_info.key,
                    lamports,
                    space as u64,
                    &id(),
                ),
                &[
                    transfer_from.clone(),
                    money_storage_info.clone(),
                    system_program_info.clone(),
                ],
                &[&signer_seeds],
            )?;

            let mut money_storage =
                MoneyStorage::try_from_slice(&money_storage_info.data.borrow())?;
            money_storage.admin = transfer_from.key.to_bytes();

            let _ = money_storage.serialize(&mut &mut money_storage_info.data.borrow_mut()[..]);
        }

        invoke(
            &system_instruction::transfer(transfer_from.key, money_storage_info.key, amount),
            &[transfer_from.clone(), money_storage_info.clone()],
        )?;

        msg!(
            "Successfully donated {} lamports from {:?} to {:?}",
            amount,
            transfer_from.key,
            money_storage_info.key
        );

        Ok(())
    }

    fn withdraw(accounts: &[AccountInfo]) -> ProgramResult {
        msg!("Withdraw");
        let acc_iter = &mut accounts.iter();

        let withdraw_user = next_account_info(acc_iter)?;
        let money_storage_info = next_account_info(acc_iter)?;

        if !withdraw_user.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let money_storage = MoneyStorage::try_from_slice(&money_storage_info.data.borrow())?;

        if withdraw_user.key.to_bytes() != money_storage.admin {
            return Err(ProgramError::InvalidArgument);
        }

        let rent_exemption = Rent::get()?.minimum_balance(money_storage_info.data_len());
        let borrow = money_storage_info.lamports() - rent_exemption;
        if borrow > money_storage_info.lamports() {
            msg!("Insufficent balance");
            return Err(ProgramError::InsufficientFunds);
        }

        **money_storage_info.try_borrow_mut_lamports()? -= borrow;
        **withdraw_user.try_borrow_mut_lamports()? += borrow;

        msg!(
            "Successfully withdrawed {:?} lamports",
            money_storage_info.lamports
        );

        Ok(())
    }
}
