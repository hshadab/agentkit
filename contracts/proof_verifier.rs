use anchor_lang::prelude::*;

declare_id!("5VzkNtgVwarEGSLvgvvPvTNqR7qQQai2MZ7BuYNqQPhw");

#[program]
pub mod proof_verifier {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn verify_proof(
        ctx: Context<VerifyProof>,
        proof_id: [u8; 32],
        commitment: [u8; 32],
        proof_type: u8,
        timestamp: i64,
    ) -> Result<()> {
        let proof_account = &mut ctx.accounts.proof_account;
        
        // Store proof data
        proof_account.proof_id = proof_id;
        proof_account.commitment = commitment;
        proof_account.proof_type = proof_type;
        proof_account.timestamp = timestamp;
        proof_account.verifier = ctx.accounts.verifier.key();
        proof_account.verified_at = Clock::get()?.unix_timestamp;
        
        // Emit event
        emit!(ProofVerified {
            proof_id,
            commitment,
            verifier: ctx.accounts.verifier.key(),
            proof_type,
            timestamp: proof_account.verified_at,
        });
        
        msg!("Proof verified: {:?}", proof_id);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(proof_id: [u8; 32], commitment: [u8; 32])]
pub struct VerifyProof<'info> {
    #[account(
        init,
        payer = verifier,
        space = 8 + ProofAccount::INIT_SPACE,
        seeds = [b"proof", commitment.as_ref()],
        bump
    )]
    pub proof_account: Account<'info, ProofAccount>,
    
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
#[derive(InitSpace)]
pub struct ProofAccount {
    pub proof_id: [u8; 32],
    pub commitment: [u8; 32],
    pub proof_type: u8,
    pub timestamp: i64,
    pub verifier: Pubkey,
    pub verified_at: i64,
}

#[event]
pub struct ProofVerified {
    pub proof_id: [u8; 32],
    pub commitment: [u8; 32],
    pub verifier: Pubkey,
    pub proof_type: u8,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid proof type")]
    InvalidProofType,
    #[msg("Proof already verified")]
    ProofAlreadyVerified,
}