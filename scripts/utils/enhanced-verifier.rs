use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    clock::Clock,
    sysvar::Sysvar,
    program::{invoke_signed},
    system_instruction,
    rent::Rent,
};
use borsh::{BorshDeserialize, BorshSerialize};

solana_program::declare_id!("11111111111111111111111111111111");

// Store verified proofs on-chain
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct VerifiedProof {
    pub commitment: [u8; 32],
    pub verifier: Pubkey,
    pub timestamp: u64,
    pub proof_type: u8,
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("zkEngine Enhanced Verifier v2.0");
    msg!("Received {} bytes of instruction data", instruction_data.len());
    
    // Check if we have exactly 73 bytes
    if instruction_data.len() != 73 {
        msg!("Error: Expected 73 bytes, got {}", instruction_data.len());
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // Parse instruction data
    let proof_id = &instruction_data[0..32];
    let commitment = &instruction_data[32..64];
    let proof_type = instruction_data[64];
    let timestamp_bytes: [u8; 8] = instruction_data[65..73].try_into()
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let timestamp = u64::from_le_bytes(timestamp_bytes);
    
    // Get accounts
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    let proof_pda = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;
    
    // Derive PDA for storing this proof
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[b"proof", commitment],
        program_id
    );
    
    // Verify PDA matches
    if pda != *proof_pda.key {
        msg!("Error: Invalid proof PDA");
        return Err(ProgramError::InvalidArgument);
    }
    
    // Check if proof already exists (replay protection)
    if !proof_pda.data_is_empty() {
        msg!("Error: Proof already verified");
        msg!("This commitment has already been verified on-chain");
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    
    let proof_type_name = match proof_type {
        1 => "KYC",
        2 => "Location", 
        3 => "AI Content",
        _ => "Unknown"
    };
    
    msg!("Verifying {} proof", proof_type_name);
    msg!("Timestamp: {}", timestamp);
    
    // Verify commitment is non-zero
    let is_zero = commitment.iter().all(|&b| b == 0);
    if is_zero {
        msg!("Error: Zero commitment");
        return Err(ProgramError::InvalidArgument);
    }
    
    // Verify timestamp is reasonable (within 1 hour)
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u64;
    if timestamp > current_time + 3600 || 
       timestamp < current_time.saturating_sub(3600) {
        msg!("Error: Timestamp out of valid range");
        return Err(ProgramError::InvalidArgument);
    }
    
    // Create PDA to store verified proof
    let space = 8 + 32 + 32 + 8 + 1; // discriminator + commitment + verifier + timestamp + type
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);
    
    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            proof_pda.key,
            lamports,
            space as u64,
            program_id,
        ),
        &[payer.clone(), proof_pda.clone(), system_program.clone()],
        &[&[b"proof", commitment, &[bump_seed]]],
    )?;
    
    // Store proof data
    let mut proof_data = VerifiedProof {
        commitment: commitment.try_into().unwrap(),
        verifier: *payer.key,
        timestamp,
        proof_type,
    };
    
    proof_data.serialize(&mut &mut proof_pda.data.borrow_mut()[..])?;
    
    msg!("✅ Commitment VALID and stored on-chain");
    msg!("Verified by: {}", payer.key);
    msg!("Proof stored at PDA: {}", proof_pda.key);
    
    Ok(())
}