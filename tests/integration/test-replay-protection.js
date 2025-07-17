const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, sendAndConfirmTransaction } = require('@solana/web3.js');

// Program ID
const PROGRAM_ID = new PublicKey('2qohsyvXBRZMVRbKX74xkM6oUfntBqGMB7Jdk15n8wn7');

// Test data
const TEST_COMMITMENT = Buffer.from('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'hex');
const TEST_PROOF_ID = Buffer.from('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'hex');

async function testReplayProtection() {
    console.log('🧪 Testing Replay Protection on Enhanced Verifier\n');
    
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // Generate a test keypair (in production, use your wallet)
    const payer = Keypair.generate();
    
    console.log('💰 Requesting airdrop for test wallet...');
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 2000000000); // 2 SOL
    await connection.confirmTransaction(airdropSig);
    
    // Create instruction data (73 bytes)
    const instructionData = Buffer.concat([
        TEST_PROOF_ID,      // 32 bytes
        TEST_COMMITMENT,    // 32 bytes  
        Buffer.from([2]),   // 1 byte (Location proof)
        Buffer.from(new BigUint64Array([BigInt(Date.now() / 1000)]).buffer) // 8 bytes timestamp
    ]);
    
    // Derive PDA
    const [proofPda] = await PublicKey.findProgramAddress(
        [Buffer.from('proof'), TEST_COMMITMENT],
        PROGRAM_ID
    );
    
    console.log('📍 Proof PDA:', proofPda.toString());
    
    // Create transaction
    const transaction = new Transaction().add(
        new TransactionInstruction({
            keys: [
                { pubkey: payer.publicKey, isSigner: true, isWritable: true },
                { pubkey: proofPda, isSigner: false, isWritable: true },
                { pubkey: PublicKey.default, isSigner: false, isWritable: false } // System program
            ],
            programId: PROGRAM_ID,
            data: instructionData
        })
    );
    
    try {
        // First verification - should succeed
        console.log('\n🚀 Attempt 1: First verification (should succeed)...');
        const sig1 = await sendAndConfirmTransaction(connection, transaction, [payer]);
        console.log('✅ SUCCESS - First verification completed!');
        console.log('Transaction:', `https://explorer.solana.com/tx/${sig1}?cluster=devnet`);
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Second verification - should fail
        console.log('\n🚀 Attempt 2: Replay same proof (should fail)...');
        try {
            const sig2 = await sendAndConfirmTransaction(connection, transaction, [payer]);
            console.log('❌ UNEXPECTED - Second verification succeeded! Replay protection may not be working.');
        } catch (error) {
            if (error.message.includes('already verified') || error.message.includes('AccountAlreadyInitialized')) {
                console.log('✅ SUCCESS - Replay protection working! Proof was rejected as already verified.');
            } else {
                console.log('❌ FAILED with unexpected error:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ First verification failed:', error.message);
    }
}

// Run test
testReplayProtection().catch(console.error);