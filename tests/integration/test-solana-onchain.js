const fs = require('fs');

async function testSolanaOnChainVerification() {
    console.log('🔗 Testing Solana On-Chain Verification');
    console.log('='.repeat(60));
    
    try {
        // 1. Check deployed program ID
        const deploymentFiles = [
            './deployed-program-id.txt',
            './deployed-solana-program-id.txt'
        ];
        
        let programId = null;
        for (const file of deploymentFiles) {
            try {
                if (fs.existsSync(file)) {
                    programId = fs.readFileSync(file, 'utf8').trim();
                    console.log(`\n✅ Found Solana program ID: ${programId}`);
                    console.log(`   From file: ${file}`);
                    break;
                }
            } catch (e) {}
        }
        
        if (!programId) {
            console.log('\n❌ No Solana program ID found');
            console.log('   Deploy a program first using deploy-solana.sh');
            return;
        }
        
        // 2. Check proofs database
        const proofsDb = JSON.parse(fs.readFileSync('./proofs_db.json', 'utf8'));
        const proofArray = Object.values(proofsDb);
        console.log(`\n📚 Found ${proofArray.length} proofs in database`);
        
        // Find recent proofs
        const recentProofs = proofArray
            .filter(p => p.status === 'complete')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 3);
            
        console.log('\n📋 Recent proofs:');
        recentProofs.forEach(proof => {
            const type = proof.metadata?.wasm_path?.includes('kyc') ? 'KYC' :
                        proof.metadata?.wasm_path?.includes('location') ? 'Location' :
                        proof.metadata?.wasm_path?.includes('ai') ? 'AI Content' : 'Unknown';
            console.log(`   - ${type}: ${proof.id}`);
            console.log(`     Generated: ${new Date(proof.timestamp).toLocaleString()}`);
            console.log(`     Size: ${proof.metrics?.file_size_mb?.toFixed(2)} MB`);
        });
        
        // 3. Check verifications database
        try {
            const verificationsDb = JSON.parse(fs.readFileSync('./verifications_db.json', 'utf8'));
            const verificationArray = Object.values(verificationsDb);
            const onChainVerifications = verificationArray.filter(v => 
                v.blockchain === 'solana' && v.status === 'verified'
            );
            
            console.log(`\n🔍 Found ${onChainVerifications.length} Solana on-chain verifications`);
            
            if (onChainVerifications.length > 0) {
                console.log('\n✅ Recent Solana verifications:');
                onChainVerifications.slice(0, 3).forEach(v => {
                    console.log(`   - Proof: ${v.proof_id}`);
                    console.log(`     Transaction: ${v.transaction_hash}`);
                    console.log(`     Verified: ${new Date(v.timestamp).toLocaleString()}`);
                });
            }
        } catch (e) {
            console.log('\n⚠️  No verifications database found');
        }
        
        console.log('\n💡 To perform on-chain verification:');
        console.log('   1. Generate a proof using the UI');
        console.log('   2. Click "Verify on Solana" button');
        console.log('   3. Connect your Phantom wallet');
        console.log('   4. Approve the transaction');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testSolanaOnChainVerification();