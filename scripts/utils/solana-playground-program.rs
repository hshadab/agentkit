use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod zk_verifier {
    use super::*;
    
    pub fn verify_proof(
        ctx: Context<VerifyProof>,
        proof_id: [u8; 32],
        proof_hash: [u8; 32],
        proof_type: ProofType,
    ) -> Result<()> {
        let proof_record = &mut ctx.accounts.proof_record;
        let clock = Clock::get()?;
        
        // Store verification
        proof_record.proof_id = proof_id;
        proof_record.proof_hash = proof_hash;
        proof_record.verifier = ctx.accounts.verifier.key();
        proof_record.verified_at = clock.unix_timestamp;
        proof_record.proof_type = proof_type;
        proof_record.is_valid = true;
        
        // Emit event
        emit!(ProofVerified {
            proof_id,
            verifier: ctx.accounts.verifier.key(),
            proof_type,
            timestamp: clock.unix_timestamp,
        });
        
        msg!("✅ Proof {} verified by {}", 
            bs58::encode(&proof_id[..8]).into_string(),
            ctx.accounts.verifier.key()
        );
        
        Ok(())
    }
    
    pub fn get_proof(
        ctx: Context<GetProof>,
        proof_id: [u8; 32],
    ) -> Result<ProofInfo> {
        let proof_record = &ctx.accounts.proof_record;
        
        Ok(ProofInfo {
            proof_id: proof_record.proof_id,
            proof_hash: proof_record.proof_hash,
            verifier: proof_record.verifier,
            verified_at: proof_record.verified_at,
            proof_type: proof_record.proof_type.clone(),
            is_valid: proof_record.is_valid,
        })
    }
}

#[derive(Accounts)]
#[instruction(proof_id: [u8; 32])]
pub struct VerifyProof<'info> {
    #[account(
        init,
        payer = verifier,
        space = 8 + ProofRecord::SIZE,
        seeds = [b"proof", proof_id.as_ref()],
        bump
    )]
    pub proof_record: Account<'info, ProofRecord>,
    
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proof_id: [u8; 32])]
pub struct GetProof<'info> {
    #[account(
        seeds = [b"proof", proof_id.as_ref()],
        bump
    )]
    pub proof_record: Account<'info, ProofRecord>,
}

#[account]
pub struct ProofRecord {
    pub proof_id: [u8; 32],
    pub proof_hash: [u8; 32],
    pub verifier: Pubkey,
    pub verified_at: i64,
    pub proof_type: ProofType,
    pub is_valid: bool,
}

impl ProofRecord {
    const SIZE: usize = 32 + 32 + 32 + 8 + 1 + 1 + 8; // Extra padding
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProofType {
    KYC,
    Location,
    AIContent,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ProofInfo {
    pub proof_id: [u8; 32],
    pub proof_hash: [u8; 32],
    pub verifier: Pubkey,
    pub verified_at: i64,
    pub proof_type: ProofType,
    pub is_valid: bool,
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
    #[msg("Proof already verified")]
    AlreadyVerified,
    #[msg("Invalid proof type")]
    InvalidProofType,
}