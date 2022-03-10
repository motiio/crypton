pub mod error;
pub mod instruction;
pub mod processor;
pub mod state;

#[cfg(not(feature = "no-entrypoint"))]
pub mod entrypoint;

pub const DONATOR_SEED: &str = "donator33333";
pub const MONEY_STORAGE_SEED: &str = "money11111";

solana_program::declare_id!("3otYy2KpQQB2j4aJgmpcNARrJ1eiJNff21Bb822dBonp");
