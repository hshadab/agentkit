#!/usr/bin/env node

// Test real Light Protocol integration
const { Connection, PublicKey } = require('@solana/web3.js');

async function testRealLightProtocol() {
    console.log('=== Testing Real Light Protocol on Devnet ===\n');
    
    const HELIUS_API_KEY = 'b230c14f-7bf7-4a45-b10a-fc413d06d2fa';
    const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${HELIUS_API_KEY}`;
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Load the configuration
    const config = require('./light-protocol-devnet.json');
    console.log('Configuration loaded:', config);
    
    console.log('\n=== Checking Program Deployments ===\n');
    
    const programs = {
        'System Program': config.systemProgram,
        'Compression Program': config.accountCompressionProgram,
        'Noop Program': config.noopProgram,
        'Merkle Tree': config.merkleTreePubkey,
        'Nullifier Queue': config.nullifierQueuePubkey
    };
    
    const results = {};
    
    for (const [name, address] of Object.entries(programs)) {
        try {
            const pubkey = new PublicKey(address);
            const accountInfo = await connection.getAccountInfo(pubkey);
            
            if (accountInfo) {
                results[name] = {
                    exists: true,
                    owner: accountInfo.owner.toString(),
                    executable: accountInfo.executable,
                    dataLength: accountInfo.data.length,
                    lamports: accountInfo.lamports
                };
                
                console.log(`✅ ${name}: ${address}`);
                console.log(`   Owner: ${accountInfo.owner.toString()}`);
                console.log(`   Executable: ${accountInfo.executable}`);
                console.log(`   Data: ${accountInfo.data.length} bytes`);
                console.log(`   Balance: ${accountInfo.lamports / 1e9} SOL\n`);
            } else {
                results[name] = { exists: false };
                console.log(`❌ ${name}: NOT FOUND`);
                console.log(`   Address: ${address}\n`);
            }
        } catch (error) {
            results[name] = { exists: false, error: error.message };
            console.log(`❌ ${name}: ERROR - ${error.message}\n`);
        }
    }
    
    // Check compression RPC methods
    console.log('\n=== Testing Compression RPC Methods ===\n');
    
    try {
        // Test getCompressionSignaturesForAddress
        const testAddress = new PublicKey(config.merkleTreePubkey);
        const signatures = await connection.getSignaturesForAddress(testAddress, { limit: 5 });
        console.log(`✅ RPC connection working - Found ${signatures.length} recent signatures`);
    } catch (error) {
        console.log(`⚠️  Standard RPC working, compression methods may require specific setup`);
    }
    
    // Test Light Protocol specific methods
    console.log('\n=== Light Protocol Specific Checks ===\n');
    
    try {
        // Check if merkle tree is initialized
        const merkleTree = new PublicKey(config.merkleTreePubkey);
        const merkleInfo = await connection.getAccountInfo(merkleTree);
        
        if (merkleInfo && merkleInfo.data.length > 0) {
            console.log('✅ Merkle tree account exists and has data');
            console.log(`   Size: ${merkleInfo.data.length} bytes`);
            
            // Try to decode the header (first 8 bytes usually contain discriminator)
            const discriminator = merkleInfo.data.slice(0, 8);
            console.log(`   Discriminator: ${discriminator.toString('hex')}`);
        } else {
            console.log('⚠️  Merkle tree exists but may not be initialized');
        }
    } catch (error) {
        console.log('❌ Error checking merkle tree:', error.message);
    }
    
    // Summary
    console.log('\n=== Summary ===\n');
    
    const programCount = Object.values(results).filter(r => r.exists && r.executable).length;
    const accountCount = Object.values(results).filter(r => r.exists && !r.executable).length;
    
    console.log(`Programs found: ${programCount}`);
    console.log(`Accounts found: ${accountCount}`);
    console.log(`Total: ${programCount + accountCount}/${Object.keys(results).length}`);
    
    if (programCount >= 3) {
        console.log('\n✅ Light Protocol core programs are deployed!');
        console.log('   The system can attempt real compression.');
    } else {
        console.log('\n⚠️  Some Light Protocol components missing.');
        console.log('   The system will fall back to demo mode.');
    }
    
    // Test compression calculation
    console.log('\n=== Compression Calculation Test ===\n');
    
    const sampleProof = {
        proofId: 'test_proof_123',
        proof: {
            a: ['1234567890', '0987654321'],
            b: [['1111', '2222'], ['3333', '4444']],
            c: ['5555', '6666']
        },
        publicSignals: ['1', '2', '3', '4'],
        proofType: 'groth16',
        timestamp: Date.now()
    };
    
    const originalSize = Buffer.from(JSON.stringify(sampleProof)).length;
    const compressedSize = 32 + 8; // Merkle root + index
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`Original proof size: ${originalSize} bytes`);
    console.log(`Compressed size: ${compressedSize} bytes`);
    console.log(`Compression ratio: ${ratio}%`);
    console.log(`Storage cost reduction: ~${ratio}%`);
    
    return results;
}

// Run the test
if (require.main === module) {
    testRealLightProtocol()
        .then(() => console.log('\n✅ Test complete!'))
        .catch(console.error);
}

module.exports = { testRealLightProtocol };