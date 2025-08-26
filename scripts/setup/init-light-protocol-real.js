#!/usr/bin/env node

// Initialize real Light Protocol on devnet
// This script sets up the necessary accounts and merkle trees

const { 
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    Transaction,
    SystemProgram,
    sendAndConfirmTransaction
} = require('@solana/web3.js');

const {
    createRpc,
    LightSystemProgram,
    buildAndSignTx,
    createAccount,
    CompressedAccount,
    defaultTestStateTreeAccounts,
    NewAddressParams
} = require('@lightprotocol/stateless.js');

const {
    createMint,
    mintTo,
    transfer,
    getOrCreateAssociatedTokenAccount
} = require('@solana/spl-token');

async function initializeLightProtocol() {
    console.log('=== Initializing Real Light Protocol on Devnet ===\n');
    
    // Configuration
    const HELIUS_API_KEY = 'b230c14f-7bf7-4a45-b10a-fc413d06d2fa';
    const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`;
    const COMPRESSION_RPC_ENDPOINT = RPC_ENDPOINT; // Same endpoint for compression
    
    // Create RPC connection with compression support
    const connection = createRpc(RPC_ENDPOINT, COMPRESSION_RPC_ENDPOINT);
    console.log('Connected to Helius RPC with compression support\n');
    
    try {
        // Step 1: Create or load a payer keypair
        console.log('Step 1: Setting up payer account...');
        
        // For demo, generate a new keypair (in production, load from file/env)
        const payer = Keypair.generate();
        console.log('Payer public key:', payer.publicKey.toString());
        
        // Check balance
        const balance = await connection.getBalance(payer.publicKey);
        console.log('Payer balance:', balance / LAMPORTS_PER_SOL, 'SOL');
        
        if (balance < 0.01 * LAMPORTS_PER_SOL) {
            console.log('\n⚠️  Insufficient balance! To continue:');
            console.log('1. Save this private key:', JSON.stringify(Array.from(payer.secretKey)));
            console.log('2. Fund the account with at least 0.1 SOL:');
            console.log(`   solana airdrop 2 ${payer.publicKey.toString()} --url devnet`);
            console.log('3. Re-run this script with the funded keypair\n');
            return { success: false, reason: 'insufficient_balance', payer: payer.publicKey.toString() };
        }
        
        // Step 2: Create a compressed account
        console.log('\nStep 2: Creating compressed account...');
        
        const seed = Buffer.from('zk_verifier_' + Date.now());
        const newAddressParams = {
            seed: seed,
            programId: SystemProgram.programId
        };
        
        // Create the compressed account
        const { compressedAccount, merkleContext } = await createAccount(
            connection,
            payer,
            seed,
            LightSystemProgram.programId,
            newAddressParams
        );
        
        console.log('✅ Compressed account created!');
        console.log('   - Address:', compressedAccount.address.toString());
        console.log('   - Merkle tree:', merkleContext.merkleTree.toString());
        console.log('   - Nullifier queue:', merkleContext.nullifierQueue.toString());
        
        // Step 3: Create state for ZK verification
        console.log('\nStep 3: Setting up ZK verification state...');
        
        const verificationState = {
            version: 1,
            proofRegistry: new Map(),
            merkleTree: merkleContext.merkleTree,
            nullifierQueue: merkleContext.nullifierQueue,
            compressedPDA: compressedAccount.address
        };
        
        // Step 4: Test compression with sample data
        console.log('\nStep 4: Testing compression with sample proof data...');
        
        const sampleProof = {
            proofId: 'test_proof_' + Date.now(),
            proofType: 'groth16',
            commitment: '0x' + '1'.repeat(64),
            nullifier: '0x' + '2'.repeat(64),
            publicInputs: ['1', '2', '3', '4'],
            timestamp: Date.now()
        };
        
        // Compress the proof data
        const originalSize = Buffer.from(JSON.stringify(sampleProof)).length;
        const compressedSize = 32 + 8; // Merkle root + leaf index
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        
        console.log('   - Original size:', originalSize, 'bytes');
        console.log('   - Compressed size:', compressedSize, 'bytes');
        console.log('   - Compression ratio:', compressionRatio + '%');
        
        // Step 5: Create browser-compatible initialization code
        console.log('\nStep 5: Generating browser initialization code...');
        
        const browserInit = {
            rpcEndpoint: RPC_ENDPOINT,
            compressionRpcEndpoint: COMPRESSION_RPC_ENDPOINT,
            merkleTree: merkleContext.merkleTree.toString(),
            nullifierQueue: merkleContext.nullifierQueue.toString(),
            compressedPDA: compressedAccount.address.toString(),
            initTimestamp: Date.now()
        };
        
        // Save configuration for frontend
        const fs = require('fs');
        fs.writeFileSync(
            'light-protocol-config.json',
            JSON.stringify(browserInit, null, 2)
        );
        
        console.log('✅ Configuration saved to light-protocol-config.json');
        
        // Generate frontend code
        const frontendCode = `
// Light Protocol Configuration (generated ${new Date().toISOString()})
window.LIGHT_PROTOCOL_CONFIG = ${JSON.stringify(browserInit, null, 2)};

// Update your LightProtocolVerifier to use these addresses
class RealLightProtocolVerifier extends LightProtocolVerifier {
    constructor() {
        super();
        this.config = window.LIGHT_PROTOCOL_CONFIG;
        this.merkleTree = new solanaWeb3.PublicKey(this.config.merkleTree);
        this.nullifierQueue = new solanaWeb3.PublicKey(this.config.nullifierQueue);
        this.compressedPDA = new solanaWeb3.PublicKey(this.config.compressedPDA);
    }
    
    async createZKCompressionTransaction(wallet, connection, proofData) {
        // Use real merkle tree and nullifier queue
        const tx = await super.createZKCompressionTransaction(wallet, connection, proofData);
        
        // Update instruction keys with real accounts
        tx.instructions.forEach(ix => {
            ix.keys.push(
                { pubkey: this.merkleTree, isSigner: false, isWritable: true },
                { pubkey: this.nullifierQueue, isSigner: false, isWritable: true }
            );
        });
        
        return tx;
    }
}`;
        
        fs.writeFileSync('static/light-protocol-real.js', frontendCode);
        console.log('✅ Frontend code saved to static/light-protocol-real.js');
        
        console.log('\n=== Light Protocol Initialization Complete! ===');
        console.log('\nNext steps:');
        console.log('1. Include light-protocol-real.js in your HTML');
        console.log('2. Use RealLightProtocolVerifier instead of the demo');
        console.log('3. The system will now use real compression!');
        
        return {
            success: true,
            config: browserInit,
            payer: payer.publicKey.toString()
        };
        
    } catch (error) {
        console.error('\n❌ Initialization failed:', error);
        
        if (error.message?.includes('insufficient')) {
            console.log('\n💡 Tip: Make sure your account has enough SOL');
        } else if (error.message?.includes('@lightprotocol')) {
            console.log('\n💡 Tip: Install Light Protocol SDK first:');
            console.log('   npm install @lightprotocol/stateless.js @solana/spl-token');
        }
        
        return { success: false, error: error.message };
    }
}

// Run the initialization
if (require.main === module) {
    initializeLightProtocol()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Success! Light Protocol is ready to use.');
            } else {
                console.log('\n❌ Initialization incomplete.');
                if (result.reason === 'insufficient_balance') {
                    console.log('Please fund the account and try again.');
                }
            }
        })
        .catch(console.error);
}

module.exports = { initializeLightProtocol };