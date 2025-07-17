const fs = require('fs');
const { Web3 } = require('web3');

// Initialize Web3
const web3 = new Web3(process.env.ETHEREUM_RPC_URL || 'https://sepolia.infura.io/v3/2f5b64b60cb84a60a6e6e69e10ba02f9');

// Load contract ABI
const contractData = JSON.parse(fs.readFileSync('./artifacts/contracts/SimplifiedZKVerifier.sol/SimplifiedZKVerifier.json', 'utf8'));
const contractABI = contractData.abi;
const contractAddress = '0xB511DE43036aCFb3D4Ec84A913c1eCa237f9437E';

// Initialize contract
const contract = new web3.eth.Contract(contractABI, contractAddress);

async function testOnChainVerification() {
    console.log('🔗 Testing Ethereum On-Chain Verification');
    console.log('='.repeat(60));
    
    try {
        // 1. Check if we have any proofs to verify
        const proofsDb = JSON.parse(fs.readFileSync('./proofs_db.json', 'utf8'));
        const proofArray = Object.values(proofsDb);
        console.log(`\n📚 Found ${proofArray.length} proofs in database`);
        
        // Find a recent KYC proof
        const kycProof = proofArray.find(p => 
            p.metadata && 
            p.metadata.wasm_path && 
            p.metadata.wasm_path.includes('kyc') && 
            p.status === 'complete'
        );
        if (!kycProof) {
            console.log('❌ No completed KYC proof found to test');
            return;
        }
        
        console.log(`\n✅ Using proof: ${kycProof.id}`);
        console.log(`   Type: KYC`);
        console.log(`   Generated: ${new Date(kycProof.timestamp).toLocaleString()}`);
        
        // 2. Check if proof is already verified on-chain
        console.log('\n🔍 Checking on-chain verification status...');
        
        // Use the file hash as proof hash
        const proofHash = kycProof.metrics?.file_hash || kycProof.id;
        console.log(`   Proof hash: ${proofHash}`);
        
        try {
            const isVerified = await contract.methods.verifiedProofs(`0x${proofHash}`).call();
            console.log(`   Current status: ${isVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
            
            if (isVerified) {
                console.log('\n✅ Proof is already verified on-chain!');
                
                // Get verification details
                const verifier = await contract.methods.verifiers(`0x${proofHash}`).call();
                console.log(`   Verifier: ${verifier}`);
            
            // Try to get block timestamp (this might not work for old proofs)
            try {
                const filter = contract.events.ProofVerified({
                    filter: { proofHash: `0x${proofHash}` },
                    fromBlock: 0,
                    toBlock: 'latest'
                });
                
                const events = await filter.get();
                if (events.length > 0) {
                    const block = await web3.eth.getBlock(events[0].blockNumber);
                    console.log(`   Verified at: ${new Date(Number(block.timestamp) * 1000).toLocaleString()}`);
                    console.log(`   Block: ${events[0].blockNumber}`);
                    console.log(`   Transaction: ${events[0].transactionHash}`);
                }
            } catch (e) {
                console.log('   (Could not retrieve verification event details)');
            }
            } else {
                console.log('\n❌ Proof not verified on-chain yet');
                console.log('   To verify, use the UI or run a verification workflow');
            }
        } catch (e) {
            console.log('   Error checking verification:', e.message);
        }
        
        // 3. Check contract balance and recent activity
        console.log('\n📊 Contract Statistics:');
        const balance = await web3.eth.getBalance(contractAddress);
        console.log(`   Balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);
        
        // Get recent blocks to check for activity
        const latestBlock = await web3.eth.getBlockNumber();
        console.log(`   Latest block: ${latestBlock}`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testOnChainVerification();