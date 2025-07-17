const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, sendAndConfirmTransaction } = require('@solana/web3.js');
const borsh = require('borsh');

// REPLACE THIS WITH YOUR DEPLOYED PROGRAM ID
const PROGRAM_ID = 'YOUR_PROGRAM_ID_HERE';

// Your wallet address
const WALLET_ADDRESS = 'A6mKVjHuha3UUcPYKH2YWW7yXBd5Zs1SUwtqmJgY44pL';

// Borsh schema for our instruction
class VerifyProofInstruction {
    constructor(fields) {
        this.proof_id = fields.proof_id;
        this.proof_type = fields.proof_type;
    }
}

const schema = new Map([
    [VerifyProofInstruction, {
        kind: 'struct',
        fields: [
            ['proof_id', [32]],
            ['proof_type', 'u8'],
        ]
    }]
]);

async function testVerification() {
    console.log('🔗 Connecting to Solana devnet...');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    
    // You'll need to load your wallet keypair here
    // For testing, you can use a temporary keypair
    console.log('⚠️  Using temporary keypair for testing');
    console.log('For real testing, connect your Solflare wallet');
    
    const payer = Keypair.generate();
    
    // Airdrop SOL for testing
    console.log('💧 Requesting airdrop...');
    const airdropSig = await connection.requestAirdrop(payer.publicKey, 1000000000);
    await connection.confirmTransaction(airdropSig);
    
    // Test all 3 proof types
    const proofTypes = [
        { type: 1, name: 'KYC' },
        { type: 2, name: 'Location' },
        { type: 3, name: 'AI Content' }
    ];
    
    for (const proof of proofTypes) {
        console.log(`\n🔐 Testing ${proof.name} proof verification...`);
        
        // Generate random proof ID
        const proofId = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            proofId[i] = Math.floor(Math.random() * 256);
        }
        
        // Create instruction
        const instruction = new VerifyProofInstruction({
            proof_id: Array.from(proofId),
            proof_type: proof.type
        });
        
        // Serialize instruction data
        const instructionData = borsh.serialize(schema, instruction);
        
        // Create transaction
        const transaction = new Transaction().add(
            new TransactionInstruction({
                keys: [
                    { pubkey: payer.publicKey, isSigner: true, isWritable: true }
                ],
                programId: new PublicKey(PROGRAM_ID),
                data: Buffer.from(instructionData)
            })
        );
        
        // Send transaction
        try {
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [payer]
            );
            
            console.log(`✅ ${proof.name} verification successful!`);
            console.log(`📋 Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
            
            // Get transaction logs
            const confirmedTx = await connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0
            });
            
            console.log('📜 Program logs:');
            confirmedTx.meta.logMessages.forEach(log => {
                if (log.includes('Program log:')) {
                    console.log(`   ${log}`);
                }
            });
            
        } catch (error) {
            console.error(`❌ ${proof.name} verification failed:`, error.message);
        }
    }
}

// Run test
testVerification().catch(console.error);