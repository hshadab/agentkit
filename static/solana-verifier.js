// Solana Proof Verifier Integration
// Handles zkEngine proof verification on Solana blockchain
// Real verification implementation matching Ethereum verifier

// Polyfill for Buffer in browser environment
if (typeof Buffer === 'undefined') {
    window.Buffer = {
        from: (data, encoding) => {
            if (encoding === 'hex') {
                const matches = data.match(/.{1,2}/g);
                return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
            }
            // Handle Uint8Array directly
            if (data instanceof Uint8Array) {
                return data;
            }
            // Handle arrays
            if (Array.isArray(data)) {
                return new Uint8Array(data);
            }
            return new TextEncoder().encode(data);
        }
    };
}

// REMOVED: First duplicate function definition - using the second one below

class SolanaVerifier {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.programId = null;
        this.isConnected = false;
        this.provider = null;
        
        // TODO: Update this with your deployed program ID
        this.PROGRAM_ID = '2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7';
    }
    
    async connect() {
        try {
            // Initialize Solana connection (devnet) with explicit commitment
            this.connection = new solanaWeb3.Connection(
                'https://api.devnet.solana.com',
                {
                    commitment: 'confirmed',
                    confirmTransactionInitialTimeout: 60000
                }
            );
            
            // Check for available Solana wallet providers
            const providers = this.getAvailableProviders();
            
            if (providers.length === 0) {
                throw new Error('No Solana wallet found. Please install a Solana wallet extension (e.g., Solflare, Backpack).');
            }
            
            // Try to connect to the first available provider
            this.provider = providers[0].provider;
            const providerName = providers[0].name;
            
            console.log(`Attempting to connect to ${providerName}...`);
            
            // Request wallet connection
            const resp = await this.provider.connect();
            this.wallet = resp.publicKey || this.provider.publicKey;
            
            console.log(`Connected to ${providerName}:`, this.wallet.toString());
            
            // Initialize program ID
            this.programId = new solanaWeb3.PublicKey(this.PROGRAM_ID);
            
            this.isConnected = true;
            
            return {
                success: true,
                wallet: this.wallet.toString(),
                provider: providerName,
                network: 'devnet'
            };
            
        } catch (error) {
            console.error('Failed to connect to Solana:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    getAvailableProviders() {
        const providers = [];
        
        // Check for Solflare first (user's preference)
        if (window.solflare && window.solflare.isSolflare) {
            providers.push({
                name: 'Solflare',
                provider: window.solflare
            });
        }
        
        // Check for Phantom
        if (window.solana && window.solana.isPhantom) {
            providers.push({
                name: 'Phantom',
                provider: window.solana
            });
        }
        
        // Check for Backpack
        if (window.backpack && window.backpack.solana) {
            providers.push({
                name: 'Backpack',
                provider: window.backpack.solana
            });
        }
        
        // Check for generic Solana provider
        if (window.solana && !window.solana.isPhantom && providers.length === 0) {
            providers.push({
                name: 'Solana Wallet',
                provider: window.solana
            });
        }
        
        return providers;
    }
    
    async fetchProofData(proofId) {
        try {
            console.log('Fetching proof data for Solana verification:', proofId);
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
            
            const response = await fetch(`/api/proof/${proofId}/solana`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Proof fetch failed:', errorText);
                throw new Error(`Failed to fetch proof data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Fetched Solana proof data:', data);
            
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('Proof fetch timed out after 120 seconds');
                throw new Error('Request timed out - proof generation exceeded 120 seconds');
            }
            console.error('Failed to fetch proof data:', error);
            throw error;
        }
    }
    
    // Wrapper method for workflow compatibility
    async verifyProof(proofId, proofType) {
        try {
            console.log('Solana verifyProof called for workflow:', proofId, proofType);
            
            // First ensure we're connected
            if (!this.isConnected) {
                const connectResult = await this.connect();
                if (!connectResult.success) {
                    throw new Error('Failed to connect to Solana wallet');
                }
            }
            
            // Call the actual on-chain verification
            return await this.verifyProofOnChain(proofId, proofType);
        } catch (error) {
            console.error('Solana verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async verifyProofOnChain(proofId, proofType) {
        try {
            if (!this.isConnected) {
                throw new Error('Not connected to Solana. Please connect first.');
            }
            
            console.log('Verifying proof on Solana DEVNET:', proofId);
            console.log('Proof type:', proofType);
            console.log('Network:', this.connection.rpcEndpoint);
            
            // Fetch the actual proof data from backend
            const proofData = await this.fetchProofData(proofId);
            
            console.log('Proof data received:', proofData);
            
            // Extract commitment and timestamp
            const commitment = proofData.commitment || '0x0000000000000000000000000000000000000000000000000000000000000000';
            const timestamp = proofData.timestamp || Math.floor(Date.now() / 1000);
            
            console.log('Debug - Proof data inputs:', {
                proofId: proofData.proof_id_bytes32 || proofId,
                commitment: commitment,
                proofType: proofType,
                timestamp: timestamp,
                commitmentLength: commitment.length
            });
            
            // Create instruction data with commitment
            const instructionData = serializeCommitmentInstruction(
                proofData.proof_id_bytes32 || proofId,
                commitment,
                proofType,
                timestamp
            );
            
            console.log('Instruction data length:', instructionData.length);
            console.log('Instruction data (hex):', Array.from(instructionData).map(b => b.toString(16).padStart(2, '0')).join(''));
            
            // Extract commitment bytes for PDA derivation
            const commitmentHex = commitment.startsWith('0x') ? commitment.slice(2) : commitment;
            // Use the correct hexToBytes function that supports variable length
            const fullCommitmentBytes = new Uint8Array(commitmentHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const commitmentBytesForPda = fullCommitmentBytes;
            
            // Use full commitment for PDA - the program expects this
            console.log('Using full commitment for PDA, length:', commitmentBytesForPda.length);
            
            // Calculate total seed length for debugging
            const proofSeedLength = Buffer.from('proof').length;
            const commitmentSeedLength = Buffer.from(commitmentBytesForPda).length;
            const totalSeedLength = proofSeedLength + commitmentSeedLength;
            console.log('Total PDA seed length:', totalSeedLength, '(proof:', proofSeedLength, '+ commitment:', commitmentSeedLength, ')');
            
            // Derive PDA for storing the proof - use full commitment as the program expects
            const [proofPda] = await solanaWeb3.PublicKey.findProgramAddress(
                [
                    Buffer.from('proof'),
                    Buffer.from(commitmentBytesForPda)
                ],
                this.programId
            );
            
            console.log('Proof PDA:', proofPda.toString());
            
            // Create transaction
            const transaction = new solanaWeb3.Transaction();
            
            // Add the verification instruction with PDA account
            const instruction = new solanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: this.wallet, isSigner: true, isWritable: true },
                    { pubkey: proofPda, isSigner: false, isWritable: true },
                    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false }
                ],
                programId: this.programId,
                data: instructionData // Don't use Buffer.from, already a Uint8Array
            });
            
            transaction.add(instruction);
            
            // Get recent blockhash
            console.log('Getting recent blockhash...');
            try {
                // Add small delay to ensure we get a fresh blockhash
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
                console.log('Blockhash:', blockhash);
                console.log('Last valid block height:', lastValidBlockHeight);
                
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = this.wallet;
                // Store for confirmation
                transaction.lastValidBlockHeight = lastValidBlockHeight;
            } catch (error) {
                console.error('Failed to get blockhash:', error);
                throw error;
            }
            
            console.log('Transaction prepared, ready to send...');
            
            // Sign and send transaction
            console.log('Requesting wallet signature...');
            const signedTx = await this.provider.signTransaction(transaction);
            console.log('Transaction signed, sending to network...');
            
            // First, check if the PDA already exists
            const accountInfo = await this.connection.getAccountInfo(proofPda);
            if (accountInfo !== null) {
                console.log('PDA already exists, checking if proof was verified...');
                // The account exists, which means this proof was already processed
                throw new Error('This proof commitment has already been processed on Solana. Each unique proof can only be verified once.');
            }
            
            // Send with skipPreflight to avoid simulation errors for already processed transactions
            const signature = await this.connection.sendRawTransaction(
                signedTx.serialize(),
                {
                    skipPreflight: true,
                    preflightCommitment: 'confirmed'
                }
            );
            console.log('Transaction sent, signature:', signature);
            
            // Wait for confirmation on real devnet
            console.log('Waiting for devnet confirmation...');
            const confirmation = await this.connection.confirmTransaction({
                signature: signature,
                blockhash: transaction.recentBlockhash,
                lastValidBlockHeight: transaction.lastValidBlockHeight
            }, 'confirmed');
            
            console.log('Devnet confirmation received:', confirmation);
            console.log('Solana devnet verification transaction confirmed:', signature);
            
            // Get transaction details to verify it succeeded
            const txDetails = await this.connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0
            });
            
            // Check if transaction succeeded
            if (txDetails?.meta?.err) {
                throw new Error('Transaction failed: ' + JSON.stringify(txDetails.meta.err));
            }
            
            // Extract logs
            const logs = txDetails?.meta?.logMessages || [];
            console.log('Program logs:', logs);
            
            return {
                success: true,
                signature: signature,
                explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
                proofId: proofId,
                logs: logs.filter(log => log.includes('Program log:'))
            };
            
        } catch (error) {
            console.error('On-chain verification failed:', error);
            
            // Check for specific error cases
            if (error.message && error.message.includes('already verified')) {
                return {
                    success: false,
                    error: 'This proof has already been verified on-chain',
                    alreadyVerified: true
                };
            }
            
            // Check for account already initialized (proof already verified)
            if (error.message && error.message.includes('AccountAlreadyInitialized')) {
                return {
                    success: false,
                    error: 'This proof has already been verified on Solana. Each proof can only be verified once on-chain.',
                    alreadyVerified: true
                };
            }
            
            // Check for transaction already processed
            if (error.message && error.message.includes('already been processed')) {
                console.error('Transaction already processed - this might be a wallet or RPC issue');
                return {
                    success: false,
                    error: 'Transaction already processed - please try again with a new proof',
                    alreadyProcessed: true
                };
            }
            
            // Log full error details
            if (error.logs) {
                console.error('Transaction logs:', error.logs);
            }
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    disconnect() {
        if (this.provider && this.provider.disconnect) {
            this.provider.disconnect();
        }
        this.isConnected = false;
        this.wallet = null;
    }
}

// Helper function to serialize instruction data as raw bytes (not Borsh)
function serializeCommitmentInstruction(proofId, commitment, proofType, timestamp) {
    // Convert proof ID to bytes (32 bytes)
    const proofIdHex = proofId.startsWith('0x') ? proofId.slice(2) : proofId;
    const proofIdBytes = hexToBytes(proofIdHex);
    
    // Convert commitment to bytes (32 bytes)
    const commitmentHex = commitment.startsWith('0x') ? commitment.slice(2) : commitment;
    const commitmentBytes = hexToBytes(commitmentHex);
    
    // Convert proof type to number
    let proofTypeNum = 0;
    if (proofType === 'prove_kyc' || proofType === 'kyc') proofTypeNum = 1;
    else if (proofType === 'prove_location' || proofType === 'location') proofTypeNum = 2;
    else if (proofType === 'prove_ai_content' || proofType === 'ai_content') proofTypeNum = 3;
    
    // Create the instruction data buffer as raw bytes
    // Format: proof_id (32 bytes) + commitment (32 bytes) + proof_type (1 byte) + timestamp (8 bytes)
    const instructionData = new Uint8Array(73); // Total: 32 + 32 + 1 + 8 = 73 bytes
    
    // Copy proof ID bytes (32 bytes at offset 0)
    instructionData.set(proofIdBytes, 0);
    
    // Copy commitment bytes (32 bytes at offset 32)
    instructionData.set(commitmentBytes, 32);
    
    // Set proof type (1 byte at offset 64)
    instructionData[64] = proofTypeNum;
    
    // Set timestamp as little-endian (8 bytes at offset 65)
    const timestampBytes = new Uint8Array(8);
    let ts = BigInt(timestamp);
    for (let i = 0; i < 8; i++) {
        timestampBytes[i] = Number(ts & 0xFFn);
        ts = ts >> 8n;
    }
    instructionData.set(timestampBytes, 65);
    
    return instructionData;
}

// Helper function to convert hex string to bytes
function hexToBytes(hex) {
    if (hex.length % 2 !== 0) {
        throw new Error('Hex string must have even length');
    }
    
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// Initialize global instance
window.SolanaVerifier = SolanaVerifier;
window.solanaVerifier = new SolanaVerifier();

// Expose the verification function for the blockchain verifier
window.verifyOnSolanaActual = async function(proofId, proofType) {
    return await window.solanaVerifier.verifyProof(proofId, proofType);
};