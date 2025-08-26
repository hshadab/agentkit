use anchor_lang::prelude::*;
use anchor_lang::solana_program::alt_bn128::prelude::*;

declare_id!("NovaZKVerify11111111111111111111111111111111");

#[program]
pub mod nova_verifier {
    use super::*;

    /// Verify a zkEngine Nova proof that has been converted to Groth16 format
    pub fn verify_proof(
        ctx: Context<VerifyProof>,
        proof_data: ProofData,
        public_inputs: PublicInputs,
    ) -> Result<()> {
        let proof_account = &mut ctx.accounts.proof_account;
        let verifier = &ctx.accounts.verifier;
        
        msg!("Verifying zkEngine proof for: {}", proof_account.proof_id);
        
        // Perform Groth16 verification using Solana's alt_bn128 syscalls
        let is_valid = verify_groth16_proof(&proof_data, &public_inputs)?;
        
        if !is_valid {
            return Err(ErrorCode::InvalidProof.into());
        }
        
        // Store verification result
        proof_account.is_verified = true;
        proof_account.verifier = verifier.key();
        proof_account.proof_type = public_inputs.proof_type;
        proof_account.timestamp = Clock::get()?.unix_timestamp;
        proof_account.commitment = public_inputs.commitment;
        
        // Update user verification status
        let user_account = &mut ctx.accounts.user_verification;
        match public_inputs.proof_type {
            ProofType::KYC => user_account.kyc_verified = true,
            ProofType::Location => user_account.location_verified = true,
            ProofType::AIContent => user_account.ai_content_verified = true,
        }
        
        emit!(ProofVerified {
            proof_id: proof_account.proof_id,
            verifier: verifier.key(),
            proof_type: public_inputs.proof_type,
            timestamp: proof_account.timestamp,
        });
        
        msg!("✅ Proof verified successfully!");
        Ok(())
    }
    
    /// Initialize a new proof account
    pub fn initialize_proof(
        ctx: Context<InitializeProof>,
        proof_id: [u8; 32],
    ) -> Result<()> {
        let proof_account = &mut ctx.accounts.proof_account;
        proof_account.proof_id = proof_id;
        proof_account.is_verified = false;
        proof_account.timestamp = 0;
        Ok(())
    }
}

/// Groth16 proof data structure (256 bytes)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProofData {
    pub a: [u8; 64],      // 2 field elements (32 bytes each)
    pub b: [u8; 128],     // 4 field elements for G2 point
    pub c: [u8; 64],      // 2 field elements
}

/// Public inputs for the proof
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PublicInputs {
    pub commitment: [u8; 32],    // Hash of the Nova proof
    pub proof_type: ProofType,   // Type of proof (KYC, Location, etc.)
    pub timestamp: i64,          // When proof was generated
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProofType {
    KYC,
    Location,
    AIContent,
}

/// Verify Groth16 proof using Solana's alt_bn128 syscalls
fn verify_groth16_proof(
    proof: &ProofData,
    public_inputs: &PublicInputs,
) -> Result<bool> {
    // In production, this would:
    // 1. Deserialize proof elements into curve points
    // 2. Compute vk_x from public inputs
    // 3. Perform pairing check: e(A,B) = e(alpha,beta) * e(vk_x,gamma) * e(C,delta)
    // 4. Use alt_bn128_pairing syscall for verification
    
    // For demo, we'll do a simplified check
    // Real implementation would use alt_bn128 operations
    
    // Mock verification: check proof structure
    let proof_hash = anchor_lang::solana_program::keccak::hashv(&[
        &proof.a,
        &proof.b,
        &proof.c,
        &public_inputs.commitment,
    ]);
    
    // Accept proofs where hash ends with enough zeros (proof of work style)
    // In production, this would be actual pairing check
    Ok(proof_hash.0[31] == 0 && proof_hash.0[30] < 16)
}

#[derive(Accounts)]
#[instruction(proof_id: [u8; 32])]
pub struct InitializeProof<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ProofAccount::SIZE,
        seeds = [b"proof", proof_id.as_ref()],
        bump
    )]
    pub proof_account: Account<'info, ProofAccount>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyProof<'info> {
    #[account(
        mut,
        seeds = [b"proof", proof_account.proof_id.as_ref()],
        bump
    )]
    pub proof_account: Account<'info, ProofAccount>,
    
    #[account(
        init_if_needed,
        payer = verifier,
        space = 8 + UserVerification::SIZE,
        seeds = [b"user_verification", verifier.key().as_ref()],
        bump
    )]
    pub user_verification: Account<'info, UserVerification>,
    
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProofAccount {
    pub proof_id: [u8; 32],
    pub is_verified: bool,
    pub verifier: Pubkey,
    pub proof_type: ProofType,
    pub timestamp: i64,
    pub commitment: [u8; 32],
}

impl ProofAccount {
    pub const SIZE: usize = 32 + 1 + 32 + 1 + 8 + 32;
}

#[account]
pub struct UserVerification {
    pub user: Pubkey,
    pub kyc_verified: bool,
    pub location_verified: bool,
    pub ai_content_verified: bool,
}

impl UserVerification {
    pub const SIZE: usize = 32 + 1 + 1 + 1;
}

#[event]
pub struct ProofVerified {
    pub proof_id: [u8; 32],
    pub verifier: Pubkey,
    pub proof_type: ProofType,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid proof")]
    InvalidProof,
    #[msg("Proof already verified")]
    AlreadyVerified,
}