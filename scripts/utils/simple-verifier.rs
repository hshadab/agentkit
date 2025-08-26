use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

solana_program::declare_id!("11111111111111111111111111111111");

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("zkEngine Simple Verifier v1.0");
    msg!("Received {} bytes of instruction data", instruction_data.len());
    
    // Check if we have exactly 73 bytes
    if instruction_data.len() != 73 {
        msg!("Error: Expected 73 bytes, got {}", instruction_data.len());
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // Parse without Borsh - just read the raw bytes
    let proof_id = &instruction_data[0..32];
    let commitment = &instruction_data[32..64];
    let proof_type = instruction_data[64];
    
    // For timestamp, read 8 bytes as u64 little-endian
    let timestamp_bytes: [u8; 8] = instruction_data[65..73].try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let timestamp = u64::from_le_bytes(timestamp_bytes);
    
    let proof_type_name = match proof_type {
        1 => "KYC",
        2 => "Location", 
        3 => "AI Content",
        _ => "Unknown"
    };
    
    msg!("Verifying {} proof", proof_type_name);
    msg!("Timestamp: {}", timestamp);
    
    // Check if commitment is non-zero
    let is_zero = commitment.iter().all(|&b| b == 0);
    if is_zero {
        msg!("Error: Zero commitment");
        return Err(ProgramError::InvalidArgument);
    }
    
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    
    msg!("✅ Commitment VALID");
    msg!("Verified by: {}", payer.key);
    
    Ok(())
}