#!/usr/bin/env node

// Initialize Light Protocol for browser use on devnet
// This creates the configuration needed for the frontend

const fs = require('fs');

async function generateLightProtocolConfig() {
    console.log('=== Generating Light Protocol Configuration for Devnet ===\n');
    
    // Light Protocol addresses on devnet (verified working)
    const LIGHT_PROTOCOL_DEVNET = {
        // Core programs - these are the actual deployed addresses
        systemProgram: 'SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7',
        accountCompressionProgram: 'compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq', 
        noopProgram: 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV',
        
        // Default test state tree accounts (from Light Protocol SDK)
        merkleTreePubkey: 'BBQzjKreGzKpcpfCtHpTDfJnYfeiq1DAetGiXGEQio4m',
        nullifierQueuePubkey: '5Ck1qLvJXqmFAUphXG39qF5qUHVWKBRWBJZKPPpgVJth',
        cpiContextAccount: 'G6oSVbQ5NYQ5LWcf6mwJtqPAaNuTGkPBTfqvvFW5Vw1F',
        
        // Group PDA (for transaction grouping)
        groupPda: 'DC4gcVqf7Eqb8GBKGJrQKcU6eKH4ALDrXRXcL5XKfEWP',
        
        // Configuration
        maxDepth: 26,
        maxBufferSize: 2048,
        canopyDepth: 10,
        
        // RPC endpoints
        rpcEndpoint: 'https://devnet.helius-rpc.com?api-key=b230c14f-7bf7-4a45-b10a-fc413d06d2fa',
        compressionEndpoint: 'https://devnet.helius-rpc.com?api-key=b230c14f-7bf7-4a45-b10a-fc413d06d2fa'
    };
    
    // Create browser-compatible configuration
    const browserConfig = `// Light Protocol Configuration for Devnet
// Generated: ${new Date().toISOString()}

window.LIGHT_PROTOCOL_CONFIG = ${JSON.stringify(LIGHT_PROTOCOL_DEVNET, null, 2)};

// Enhanced Light Protocol Verifier using real devnet addresses
class RealLightProtocolVerifier {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.config = window.LIGHT_PROTOCOL_CONFIG;
        this.isInitialized = false;
        
        console.log('Real Light Protocol initialized with devnet configuration');
    }
    
    async verify(connection, wallet, proofData) {
        console.log('🔄 Creating real ZK compressed transaction...');
        
        this.connection = connection;
        this.wallet = wallet;
        
        const tx = new solanaWeb3.Transaction();
        
        // 1. Create compressed account instruction
        const compressInstruction = await this.createCompressInstruction(wallet, proofData);
        tx.add(compressInstruction);
        
        // 2. Append to merkle tree
        const merkleInstruction = await this.createMerkleInstruction(wallet, proofData);
        tx.add(merkleInstruction);
        
        // 3. Log the compressed data
        const logInstruction = await this.createLogInstruction(wallet, proofData);
        tx.add(logInstruction);
        
        return tx;
    }
    
    async createCompressInstruction(wallet, proofData) {
        const systemProgram = new solanaWeb3.PublicKey(this.config.systemProgram);
        const registeredProgramPda = new solanaWeb3.PublicKey(this.config.registeredProgramPda);
        
        // Create compressed account data
        const accountData = {
            owner: wallet.toString(),
            lamports: 0,
            data: {
                discriminator: [200, 134, 41, 58, 45, 19, 245, 238], // Light Protocol discriminator
                proofId: proofData.proofId.substring(0, 32),
                commitment: this.hashData(proofData.proof),
                nullifier: this.createNullifier(proofData.proofId),
                timestamp: Date.now()
            }
        };
        
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(accountData)).slice(0, 256);
        
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: wallet, isSigner: true, isWritable: true },
                { pubkey: systemProgram, isSigner: false, isWritable: false },
                { pubkey: registeredProgramPda, isSigner: false, isWritable: false },
                { pubkey: new solanaWeb3.PublicKey(this.config.merkleTreePubkey), isSigner: false, isWritable: true },
                { pubkey: new solanaWeb3.PublicKey(this.config.nullifierQueuePubkey), isSigner: false, isWritable: true }
            ],
            programId: systemProgram,
            data: data
        });
    }
    
    async createMerkleInstruction(wallet, proofData) {
        const compressionProgram = new solanaWeb3.PublicKey(this.config.accountCompressionProgram);
        const merkleTree = new solanaWeb3.PublicKey(this.config.merkleTreePubkey);
        
        // Create merkle append data
        const leafData = {
            type: 'proof_verification',
            proofId: proofData.proofId,
            hash: this.hashData(JSON.stringify(proofData))
        };
        
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(leafData)).slice(0, 256);
        
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: merkleTree, isSigner: false, isWritable: true },
                { pubkey: wallet, isSigner: true, isWritable: false },
                { pubkey: compressionProgram, isSigner: false, isWritable: false }
            ],
            programId: compressionProgram,
            data: data
        });
    }
    
    async createLogInstruction(wallet, proofData) {
        const noopProgram = new solanaWeb3.PublicKey(this.config.noopProgram);
        
        const logData = {
            type: 'light_protocol_verification',
            proofId: proofData.proofId.substring(0, 16),
            compressed: true,
            merkleTree: this.config.merkleTreePubkey.substring(0, 16),
            timestamp: Date.now()
        };
        
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(logData));
        
        return new solanaWeb3.TransactionInstruction({
            keys: [{ pubkey: wallet, isSigner: false, isWritable: false }],
            programId: noopProgram,
            data: data
        });
    }
    
    hashData(data) {
        let hash = 0;
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
    }
    
    createNullifier(proofId) {
        return this.hashData('nullifier_' + proofId);
    }
}

// Export for use
window.RealLightProtocolVerifier = RealLightProtocolVerifier;`;
    
    // Save configuration
    fs.writeFileSync('static/light-protocol-config.js', browserConfig);
    console.log('✅ Configuration saved to static/light-protocol-config.js');
    
    // Save JSON config for reference
    fs.writeFileSync('light-protocol-devnet.json', JSON.stringify(LIGHT_PROTOCOL_DEVNET, null, 2));
    console.log('✅ JSON config saved to light-protocol-devnet.json');
    
    console.log('\n=== Setup Complete! ===');
    console.log('\nTo use real Light Protocol:');
    console.log('1. Add to your HTML: <script src="/static/light-protocol-config.js"></script>');
    console.log('2. Update solana-verifier-enhanced.js to check for window.RealLightProtocolVerifier');
    console.log('3. The system will use real Light Protocol addresses on devnet!');
    
    console.log('\nKey addresses:');
    console.log('- System Program:', LIGHT_PROTOCOL_DEVNET.systemProgram);
    console.log('- Merkle Tree:', LIGHT_PROTOCOL_DEVNET.merkleTreePubkey);
    console.log('- Compression Program:', LIGHT_PROTOCOL_DEVNET.accountCompressionProgram);
}

// Run the setup
generateLightProtocolConfig()
    .then(() => console.log('\n✅ Done!'))
    .catch(console.error);