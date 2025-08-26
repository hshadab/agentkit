#!/usr/bin/env node

// Setup script for Light Protocol accounts
// This initializes the required accounts for Light Protocol compression

const { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');

async function setupLightProtocol() {
    console.log('=== Light Protocol Account Setup ===\n');
    
    // Configuration
    const HELIUS_API_KEY = 'b230c14f-7bf7-4a45-b10a-fc413d06d2fa';
    const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`;
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    console.log('Connected to:', RPC_ENDPOINT);
    
    // Light Protocol Program IDs (from mainnet/devnet deployments)
    const PROGRAMS = {
        SYSTEM_PROGRAM: new PublicKey('SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7'),
        COMPRESSION_PROGRAM: new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq'),
        NOOP_PROGRAM: new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'),
        // Light Protocol Registry Program
        REGISTRY_PROGRAM: new PublicKey('7Z3Yv4KPzL8JYs8voNTHKBfacqCDKngtCQvgmapDeHVK'),
        // Light Protocol State Merkle Tree
        STATE_MERKLE_TREE: new PublicKey('BBQzjKreGzKpcpfCtHpTDfJnYfeiq1DAetGiXGEQio4m')
    };
    
    try {
        // Check if programs exist
        console.log('Checking Light Protocol programs...\n');
        
        for (const [name, pubkey] of Object.entries(PROGRAMS)) {
            try {
                const accountInfo = await connection.getAccountInfo(pubkey);
                if (accountInfo) {
                    console.log(`✅ ${name}: ${pubkey.toString()}`);
                    console.log(`   - Owner: ${accountInfo.owner.toString()}`);
                    console.log(`   - Executable: ${accountInfo.executable}`);
                    console.log(`   - Data length: ${accountInfo.data.length} bytes`);
                } else {
                    console.log(`❌ ${name}: Not found on devnet`);
                }
            } catch (e) {
                console.log(`❌ ${name}: Error checking - ${e.message}`);
            }
        }
        
        // Create initialization instructions
        console.log('\n=== Creating Initialization Transaction ===\n');
        
        // Note: In a real deployment, you would need to:
        // 1. Create a funded keypair
        // 2. Initialize merkle tree accounts
        // 3. Register with Light Protocol
        
        console.log('To fully initialize Light Protocol, you need:');
        console.log('1. A funded wallet (at least 0.1 SOL)');
        console.log('2. Initialize a merkle tree account');
        console.log('3. Register your program with Light Protocol');
        console.log('4. Set up compression parameters');
        
        console.log('\nFor demo purposes, we\'ll create a mock initialization that simulates the process.');
        
        // Create mock initialization data
        const mockInit = {
            merkleTreeConfig: {
                maxDepth: 14,
                maxBufferSize: 64,
                canopyDepth: 0
            },
            compressionConfig: {
                compressionLevel: 9,
                chunkSize: 1024
            },
            registryEntry: {
                program: 'ZKVerifier',
                version: '1.0.0',
                merkleTreePubkey: 'mock_tree_pubkey'
            }
        };
        
        console.log('\nMock initialization config:');
        console.log(JSON.stringify(mockInit, null, 2));
        
        // Generate setup instructions for the frontend
        console.log('\n=== Frontend Integration Instructions ===\n');
        
        const frontendCode = `
// Add this to your Light Protocol verifier initialization
async initializeLightProtocolAccount(wallet, connection) {
    // Check if already initialized
    const [accountPDA] = await PublicKey.findProgramAddress(
        [
            Buffer.from('light_account'),
            wallet.toBuffer()
        ],
        new PublicKey('SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7')
    );
    
    const accountInfo = await connection.getAccountInfo(accountPDA);
    if (accountInfo) {
        console.log('Light Protocol account already initialized');
        return accountPDA;
    }
    
    // Create initialization transaction
    const tx = new Transaction();
    
    // Add initialization instruction
    const initIx = {
        keys: [
            { pubkey: wallet, isSigner: true, isWritable: true },
            { pubkey: accountPDA, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: new PublicKey('SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7'),
        data: Buffer.from([0]) // Init instruction
    };
    
    tx.add(initIx);
    
    // Sign and send
    const signature = await connection.sendTransaction(tx, [wallet]);
    await connection.confirmTransaction(signature);
    
    console.log('Light Protocol account initialized:', accountPDA.toString());
    return accountPDA;
}`;

        console.log(frontendCode);
        
        console.log('\n=== Alternative: Use Light Protocol SDK ===\n');
        console.log('For production use, install the Light Protocol SDK:');
        console.log('npm install @lightprotocol/stateless.js');
        console.log('\nThen use their initialization helpers:');
        console.log(`
import { createRpc, LightSystemProgram, createAccount } from '@lightprotocol/stateless.js';

const rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT);
const account = await createAccount(rpc, payer, seed, programId);
`);

        return true;
        
    } catch (error) {
        console.error('Setup failed:', error);
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    setupLightProtocol()
        .then(success => {
            console.log('\n' + (success ? '✅ Setup check complete' : '❌ Setup failed'));
            process.exit(success ? 0 : 1);
        })
        .catch(console.error);
}

module.exports = { setupLightProtocol };