use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program_pack::{Pack, Sealed},
    sysvar::{clock::Clock, Sysvar},
};
use borsh::{BorshDeserialize, BorshSerialize};

entrypoint!(process_instruction);

#[derive(BorshSerialize, BorshDeserialize, Debug, PartialEq)]
pub struct ProofVerification {
    pub proof_id: [u8; 32],
    pub commitment: [u8; 32],
    pub proof_type: u8,
    pub timestamp: i64,
    pub verified: bool,
    pub verifier: Pubkey,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    msg!("ZK Verifier: Processing instruction");
    
    let accounts_iter = &mut accounts.iter();
    let payer = next_account_info(accounts_iter)?;
    let proof_account = next_account_info(accounts_iter)?;
    let clock_account = next_account_info(accounts_iter)?;
    
    // Check signer
    if !payer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    
    // Parse instruction data
    if instruction_data.len() < 65 {
        msg!("Invalid instruction data length");
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let proof_id: [u8; 32] = instruction_data[0..32].try_into().unwrap();
    let commitment: [u8; 32] = instruction_data[32..64].try_into().unwrap();
    let proof_type = instruction_data[64];
    
    msg!("Verifying proof ID: {:?}", &proof_id[0..8]);
    msg!("Commitment: {:?}", &commitment[0..8]);
    msg!("Proof type: {}", proof_type);
    
    // Get current timestamp
    let clock = Clock::from_account_info(clock_account)?;
    
    // In a real implementation, we would:
    // 1. Verify the Groth16 proof components
    // 2. Check against a verification key
    // 3. Validate public inputs
    
    // For demonstration, we verify based on commitment structure
    let is_valid = verify_proof(&commitment, proof_type);
    
    if is_valid {
        msg!("✅ Proof verified successfully on Solana!");
        
        // Store verification result
        let verification = ProofVerification {
            proof_id,
            commitment,
            proof_type,
            timestamp: clock.unix_timestamp,
            verified: true,
            verifier: *payer.key,
        };
        
        // In production, we'd store this in a PDA
        msg!("Verification stored at timestamp: {}", verification.timestamp);
        Ok(())
    } else {
        msg!("❌ Proof verification failed!");
        Err(ProgramError::InvalidArgument)
    }
}

fn verify_proof(commitment: &[u8; 32], proof_type: u8) -> bool {
    // Simple validation for demonstration
    // In production, this would perform actual Groth16 verification
    
    // Check commitment is non-zero
    let has_commitment = commitment.iter().any(|&b| b != 0);
    
    // Check valid proof type
    let valid_type = matches!(proof_type, 1..=3);
    
    has_commitment && valid_type
}