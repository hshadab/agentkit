const { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } = require('@solana/web3.js');

async function testLightProtocol() {
    console.log('=== Testing Light Protocol Integration ===\n');
    
    // Light Protocol program IDs
    const LIGHT_SYSTEM_PROGRAM = new PublicKey('SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7');
    const COMPRESSION_PROGRAM = new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq');
    const COMPRESSED_TOKEN_PROGRAM = new PublicKey('cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m');
    const NOOP_PROGRAM = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');
    
    console.log('Light Protocol Programs:');
    console.log('- System Program:', LIGHT_SYSTEM_PROGRAM.toString());
    console.log('- Compression Program:', COMPRESSION_PROGRAM.toString());
    console.log('- Compressed Token:', COMPRESSED_TOKEN_PROGRAM.toString());
    console.log('- Noop Program:', NOOP_PROGRAM.toString());
    
    // Connect to Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    console.log('\nConnecting to Solana devnet...');
    
    // Check if programs exist
    console.log('\nChecking program deployments:');
    
    for (const [name, programId] of [
        ['Light System', LIGHT_SYSTEM_PROGRAM],
        ['Compression', COMPRESSION_PROGRAM],
        ['Compressed Token', COMPRESSED_TOKEN_PROGRAM],
        ['Noop', NOOP_PROGRAM]
    ]) {
        try {
            const accountInfo = await connection.getAccountInfo(programId);
            if (accountInfo) {
                console.log(`✅ ${name} Program: Deployed (${accountInfo.data.length} bytes)`);
                console.log(`   Owner: ${accountInfo.owner.toString()}`);
                console.log(`   Executable: ${accountInfo.executable}`);
            } else {
                console.log(`❌ ${name} Program: Not found`);
            }
        } catch (error) {
            console.log(`❌ ${name} Program: Error - ${error.message}`);
        }
    }
    
    // Test creating a Light Protocol-style transaction
    console.log('\n=== Testing Transaction Creation ===');
    
    // Create a test wallet (not submitting, just testing structure)
    const testWallet = PublicKey.default;
    
    const tx = new Transaction();
    
    // 1. Create Light Protocol instruction
    const lightInstruction = new TransactionInstruction({
        keys: [
            { pubkey: testWallet, isSigner: true, isWritable: true },
            { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: LIGHT_SYSTEM_PROGRAM,
        data: Buffer.from('test_zk_verification')
    });
    
    tx.add(lightInstruction);
    
    // 2. Add compression instruction
    const compressionInstruction = new TransactionInstruction({
        keys: [
            { pubkey: testWallet, isSigner: true, isWritable: false },
            { pubkey: COMPRESSION_PROGRAM, isSigner: false, isWritable: false }
        ],
        programId: COMPRESSION_PROGRAM,
        data: Buffer.from(JSON.stringify({
            instruction: 'append',
            merkle_root: '0x' + '0'.repeat(64)
        }))
    });
    
    tx.add(compressionInstruction);
    
    // 3. Add logging instruction
    const logInstruction = new TransactionInstruction({
        keys: [{ pubkey: testWallet, isSigner: false, isWritable: false }],
        programId: NOOP_PROGRAM,
        data: Buffer.from(JSON.stringify({
            type: 'light_protocol_test',
            timestamp: Date.now()
        }))
    });
    
    tx.add(logInstruction);
    
    console.log('✅ Created transaction with', tx.instructions.length, 'instructions');
    console.log('   - Light System instruction');
    console.log('   - Compression instruction');
    console.log('   - Noop logging instruction');
    
    // Check Light Protocol SDK
    console.log('\n=== Checking Light Protocol SDK ===');
    try {
        const stateless = require('@lightprotocol/stateless.js');
        console.log('✅ @lightprotocol/stateless.js is installed');
        
        // Check for createRpc function
        if (stateless.createRpc) {
            console.log('✅ createRpc function available');
        }
        
        // Check for other exports
        const exports = Object.keys(stateless);
        console.log('Available exports:', exports.join(', '));
        
    } catch (error) {
        console.log('❌ Light Protocol SDK not fully available:', error.message);
    }
    
    console.log('\n=== Test Complete ===');
}

// Run the test
testLightProtocol().catch(console.error);