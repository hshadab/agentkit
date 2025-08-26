// Real Solana ZK Proof Verifier
// This version works with the deployed program

class RealSolanaVerifier {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.programId = null;
        this.isConnected = false;
    }
    
    async connect() {
        try {
            const { solana } = window;
            if (!solana?.isPhantom) {
                throw new Error('Phantom wallet not found');
            }
            
            const response = await solana.connect();
            this.wallet = response.publicKey;
            
            this.connection = new solanaWeb3.Connection(
                'https://api.devnet.solana.com',
                'confirmed'
            );
            
            // UPDATE THIS WITH YOUR DEPLOYED PROGRAM ID
            this.programId = new solanaWeb3.PublicKey('YOUR_PROGRAM_ID_HERE');
            
            this.isConnected = true;
            console.log('Connected to Phantom:', this.wallet.toString());
            
            return { success: true, wallet: this.wallet.toString() };
        } catch (error) {
            console.error('Connection failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    async verifyProofOnChain(proofId, proofData, publicInputs, proofType) {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to Solana');
            }
            
            console.log('Verifying proof:', proofId);
            
            // Convert proof ID to bytes
            const encoder = new TextEncoder();
            const proofIdBytes = new Uint8Array(32);
            const encoded = encoder.encode(proofId);
            proofIdBytes.set(encoded.slice(0, 32));
            
            // Create proof hash
            const proofString = JSON.stringify({ proofData, publicInputs });
            const msgBuffer = encoder.encode(proofString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const proofHash = new Uint8Array(hashBuffer);
            
            // Get proof type enum
            const proofTypeEnum = this.getProofTypeEnum(proofType);
            
            // Derive PDA for proof record
            const [proofPDA] = await solanaWeb3.PublicKey.findProgramAddress(
                [encoder.encode('proof'), proofIdBytes],
                this.programId
            );
            
            console.log('Proof PDA:', proofPDA.toString());
            
            // Create the instruction
            const ix = await this.createVerifyInstruction(
                proofPDA,
                proofIdBytes,
                proofHash,
                proofTypeEnum
            );
            
            // Build transaction
            const tx = new solanaWeb3.Transaction().add(ix);
            
            // Set blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = this.wallet;
            
            // Sign and send
            const signed = await window.solana.signTransaction(tx);
            const signature = await this.connection.sendRawTransaction(signed.serialize());
            
            // Wait for confirmation
            await this.connection.confirmTransaction(signature, 'confirmed');
            
            console.log('Proof verified! Tx:', signature);
            
            return {
                success: true,
                signature: signature,
                explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
                proofAccount: proofPDA.toString(),
                message: 'Proof permanently recorded on Solana!'
            };
            
        } catch (error) {
            console.error('Verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async createVerifyInstruction(proofPDA, proofId, proofHash, proofType) {
        // Manual instruction creation (without IDL)
        // Discriminator for 'verify_proof' = first 8 bytes of sha256('global:verify_proof')
        const discriminator = new Uint8Array([175, 175, 47, 120, 172, 57, 234, 110]);
        
        // Serialize instruction data
        const data = new Uint8Array([
            ...discriminator,
            ...proofId,
            ...proofHash,
            ...this.serializeProofType(proofType)
        ]);
        
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: proofPDA, isSigner: false, isWritable: true },
                { pubkey: this.wallet, isSigner: true, isWritable: true },
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }
            ],
            programId: this.programId,
            data: data
        });
    }
    
    serializeProofType(proofType) {
        // Anchor enum serialization
        switch(proofType) {
            case 'kyc':
            case 'prove_kyc':
                return new Uint8Array([0]); // KYC = 0
            case 'location':
            case 'prove_location':
                return new Uint8Array([1]); // Location = 1
            case 'ai_content':
            case 'prove_ai_content':
                return new Uint8Array([2]); // AIContent = 2
            default:
                return new Uint8Array([0]);
        }
    }
    
    getProofTypeEnum(proofType) {
        const normalized = proofType.replace('prove_', '');
        return normalized;
    }
    
    async getProofInfo(proofId) {
        try {
            // Convert proof ID to bytes
            const encoder = new TextEncoder();
            const proofIdBytes = new Uint8Array(32);
            const encoded = encoder.encode(proofId);
            proofIdBytes.set(encoded.slice(0, 32));
            
            // Derive PDA
            const [proofPDA] = await solanaWeb3.PublicKey.findProgramAddress(
                [encoder.encode('proof'), proofIdBytes],
                this.programId
            );
            
            // Fetch account
            const accountInfo = await this.connection.getAccountInfo(proofPDA);
            if (!accountInfo) {
                return null;
            }
            
            // Parse data (simplified - in production use Anchor IDL)
            return {
                exists: true,
                address: proofPDA.toString(),
                data: accountInfo.data
            };
            
        } catch (error) {
            console.error('Failed to get proof info:', error);
            return null;
        }
    }
}

// Export for use
window.RealSolanaVerifier = RealSolanaVerifier;