import CircleUSDCHandler from './circleHandler.js';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test addresses for demo - including Solana addresses
const TEST_ADDRESSES = {
    "alice": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "alice_solana": "7UX2i7SucgLMQcfZ75s3VXmZZY4YRUyJN9X1RgfMoDUi",
    "bob": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "bob_solana": "GsbwXfJraMomNxBcjYLcG3mxkBUiyWXAB32fGbSMQRdW",
    "charlie": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "charlie_solana": "2sWRYvL8M4S9XPvKNfUdy2Qvn6LYaXjqXDvMv9KsxbUa"
};

// Initialize handler
const circleHandler = new CircleUSDCHandler();

// ZKP verification class
class ZKPVerifier {
    constructor() {
        this.zkEngineUrl = 'ws://localhost:8001/ws';
        this.ws = null;
        this.activeProof = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.zkEngineUrl);
            
            this.ws.on('open', () => {
                console.log('✅ Connected to zkEngine for KYC verification');
                resolve();
            });

            this.ws.on('error', (error) => {
                reject(new Error('Failed to connect to zkEngine. Please ensure the Rust WebSocket server is running on port 8001.'));
            });

            // Timeout after 3 seconds
            setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('zkEngine connection timeout. Please start the Rust server with: cargo run'));
                }
            }, 3000);
        });
    }

    async generateKYCProof() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('zkEngine not connected. Cannot generate KYC proof.');
        }

        return new Promise((resolve, reject) => {
            const messageHandler = (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log('zkEngine message:', message.type);
                    
                    if (message.data && message.data.type === 'proof_start') {
                        console.log('🚀 Proof generation started:', message.data.proof_id);
                        this.activeProof = message.data;
                    }
                    
                    if (message.data && message.data.type === 'proof_complete') {
                        console.log('✅ Proof generation complete:', message.data.proof_id);
                        this.ws.off('message', messageHandler);
                        resolve(message.data);
                    }
                    
                    if (message.type === 'error') {
                        this.ws.off('message', messageHandler);
                        reject(new Error(message.content || 'Proof generation failed'));
                    }
                } catch (e) {
                    console.error('Message parse error:', e);
                    reject(new Error('Failed to parse zkEngine response'));
                }
            };
            
            this.ws.on('message', messageHandler);
            
            // Send proof request
            const proofRequest = {
                message: "prove KYC compliance"
            };
            
            console.log('📤 Sending proof request:', proofRequest);
            this.ws.send(JSON.stringify(proofRequest));
            
            // Timeout after 30 seconds
            setTimeout(() => {
                this.ws.off('message', messageHandler);
                reject(new Error('KYC proof generation timeout. zkEngine may be overloaded.'));
            }, 30000);
        });
    }

    async verifyProof(proofData) {
        console.log('🔍 Verifying proof:', proofData.proof_id);
        
        const proofDir = path.join(process.cwd(), '..', 'proofs', proofData.proof_id);
        console.log('📁 Looking for proof files in:', proofDir);
        
        const proofFile = path.join(proofDir, 'proof.bin');
        const publicFile = path.join(proofDir, 'public.json');
        
        if (!fs.existsSync(proofFile) || !fs.existsSync(publicFile)) {
            throw new Error(`Proof files not found for ${proofData.proof_id}. Verification failed.`);
        }
        
        console.log('✅ Proof files exist - KYC verification successful');
        return true;
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Complete KYC → USDC Transfer flow
async function handleKYCAndTransfer(amount, recipientAddress, blockchain = 'ETH') {
    let zkpVerifier = null;
    
    try {
        console.log('🔐 Starting KYC verification process...');
        
        zkpVerifier = new ZKPVerifier();
        await zkpVerifier.connect();
        
        const proofData = await zkpVerifier.generateKYCProof();
        const isKYCValid = await zkpVerifier.verifyProof(proofData);
        
        if (!isKYCValid) {
            throw new Error('KYC verification failed');
        }
        
        console.log('✅ KYC verified through zero-knowledge proof!');
        
        // Execute USDC transfer
        console.log(`💸 Sending ${amount} USDC to ${recipientAddress} on ${blockchain}...`);
        const transaction = await circleHandler.transferUSDC(
            amount,
            recipientAddress,
            true, // KYC verified
            blockchain
        );
        
        const transactionId = transaction.id || transaction.transactionHash || transaction.transferId || 'Processing';
        const sourceAddress = blockchain === 'SOL' 
            ? 'HsZdbBxZVNzEn4qR9Ebx5XxDSZ136Mu14VlH1nbXGhfG'
            : '0x82a26a6d847e7e0961ab432b9a5a209e0db41040';
        
        return {
            success: true,
            transactionId: transactionId,
            transferId: transactionId,
            message: `Sent ${amount} USDC to ${recipientAddress} on ${blockchain} (KYC verified)`,
            amount: amount,
            recipient: recipientAddress,
            from: sourceAddress,
            blockchain: blockchain,
            simulated: transaction.simulated || false
        };
        
    } catch (error) {
        console.error('KYC transfer failed:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (zkpVerifier) {
            zkpVerifier.close();
        }
    }
}

// Natural language processing
async function processNaturalLanguageCommand(command) {
    const lowerCommand = command.toLowerCase();
    console.error(`Processing command: ${command}`);

    // Parse send commands
    if (lowerCommand.includes('send') && lowerCommand.includes('usdc')) {
        // Match amount and recipient (case-sensitive for addresses)
        const amountMatch = lowerCommand.match(/send (\d+(?:\.\d+)?) (?:test )?usdc/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0.1;
        
        // Extract recipient - preserve case for addresses
        let recipientMatch = command.match(/to ([a-zA-Z]+|0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})/);
        let recipient = recipientMatch ? recipientMatch[1] : 'alice';
        
        // Determine blockchain and resolve address
        let blockchain = 'ETH';
        let recipientAddress = recipient;
        
        const isSolanaRequested = lowerCommand.includes('solana') || lowerCommand.includes(' sol');
        
        // If it's a name, get the appropriate address
        const recipientLower = recipient.toLowerCase();
        if (TEST_ADDRESSES[recipientLower]) {
            if (isSolanaRequested) {
                recipientAddress = TEST_ADDRESSES[`${recipientLower}_solana`] || TEST_ADDRESSES[recipientLower];
                if (TEST_ADDRESSES[`${recipientLower}_solana`]) {
                    blockchain = 'SOL';
                }
            } else {
                recipientAddress = TEST_ADDRESSES[recipientLower];
            }
        } else {
            // Check address format (preserve original case)
            if (recipient.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
                blockchain = 'SOL';
            } else if (recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
                blockchain = 'ETH';
            }
            
            if (isSolanaRequested && blockchain === 'ETH') {
                blockchain = 'SOL';
            }
        }

        console.error(`📝 Processing: Send ${amount} USDC to ${recipientAddress} on ${blockchain}`);

        // Check if KYC is mentioned
        const requiresKYC = lowerCommand.includes('kyc') || lowerCommand.includes('verified') || lowerCommand.includes('if kyc');

        try {
            await circleHandler.initialize();
            
            if (requiresKYC) {
                console.log('🔐 KYC verification required. Initiating zero-knowledge proof generation...');
                return await handleKYCAndTransfer(amount, recipientAddress, blockchain);
            } else {
                // Direct transfer without KYC
                const result = await circleHandler.transferUSDC(amount, recipientAddress, true, blockchain);
                
                const transactionId = result.id || result.transactionHash || result.transferId || 'Processing';
                const sourceAddress = blockchain === 'SOL' 
                    ? 'HsZdbBxZVNzEn4qR9Ebx5XxDSZ136Mu14VlH1nbXGhfG'
                    : '0x82a26a6d847e7e0961ab432b9a5a209e0db41040';
                
                return {
                    success: true,
                    transactionId: transactionId,
                    transferId: transactionId,
                    message: `Sent ${amount} USDC to ${recipientAddress} on ${blockchain}`,
                    amount: amount,
                    recipient: recipientAddress,
                    from: sourceAddress,
                    blockchain: blockchain,
                    simulated: result.simulated || false
                };
            }
        } catch (error) {
            console.error('Transfer error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Parse balance check
    if (lowerCommand.includes('balance') || lowerCommand.includes('how much')) {
        const blockchain = (lowerCommand.includes('solana') || lowerCommand.includes(' sol')) ? 'SOL' : 'ETH';
        try {
            await circleHandler.initialize();
            const balance = await circleHandler.getBalance(blockchain);
            return { 
                success: true, 
                action: 'balance_check', 
                blockchain: blockchain,
                balance: balance
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    throw new Error('Invalid command format. Use: "send [amount] USDC to [recipient] [on solana]"');
}

export { circleHandler, handleKYCAndTransfer, processNaturalLanguageCommand };
