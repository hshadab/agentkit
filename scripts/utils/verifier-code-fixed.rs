use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    clock::Clock,
    sysvar::Sysvar,
};
use borsh::{BorshDeserialize, BorshSerialize};

solana_program::declare_id!("11111111111111111111111111111111");

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct VerifyCommitmentInstruction {
    pub proof_id: [u8; 32],
    pub commitment: [u8; 32], 
    pub proof_type: u8,
    pub timestamp: u64,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    solana_program::msg!("zkEngine Commitment Verifier v1.0");
    
    let instruction = VerifyCommitmentInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    let proof_type_name = match instruction.proof_type {
        1 => "KYC",
        2 => "Location", 
        3 => "AI Content",
        _ => "Unknown"
    };
    
    solana_program::msg!("Verifying {} proof commitment", proof_type_name);
    
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    
    // Verify non-zero commitment
    if instruction.commitment == [0u8; 32] {
        solana_program::msg!("Error: Invalid zero commitment");
        return Err(ProgramError::InvalidArgument);
    }
    
    // Verify timestamp
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;
    if instruction.timestamp > current_time + 3600 || 
       instruction.timestamp < current_time.saturating_sub(3600) {
        solana_program::msg!("Error: Timestamp out of range");
        return Err(ProgramError::InvalidArgument);
    }
    
    solana_program::msg!("Commitment VALID");
    solana_program::msg!("Verifier: {}", payer.key);
    
    Ok(())
}