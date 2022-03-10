use {borsh::BorshDeserialize, borsh::BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone, PartialEq)]
pub enum ProgramInstruction {
    // Donate lamports
    // Accounts:
    // 0. `[signer]` owner of account
    // 1. `[writable]` owner of account
    Donate { amount: u64 },
    Withdraw,
}
