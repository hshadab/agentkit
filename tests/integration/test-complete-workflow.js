/**
 * Complete Workflow Integration Test
 * 
 * Tests the full 3-step workflow:
 * 1. JOLT-Atlas zkML proof generation
 * 2. On-chain verification on Sepolia
 * 3. Circle Gateway payment (simulated)
 */

const axios = require('axios');

const ZKML_BACKEND = 'http://localhost:8002';
const GROTH16_BACKEND = 'http://localhost:3004';

async function runCompleteWorkflow() {
    console.log('🚀 Testing Complete zkML Workflow\n');
    console.log('Step 1: Generate JOLT-Atlas zkML Proof');
    console.log('Step 2: Verify on Ethereum Sepolia');
    console.log('Step 3: Circle Gateway Payment\n');
    
    try {
        // Step 1: Generate zkML proof
        console.log('📊 Step 1: Generating zkML Proof...');
        
        const zkmlResponse = await axios.post(`${ZKML_BACKEND}/zkml/prove`, {
            llmParams: {
                approve_confidence: 95,
                attention_score_rules: 85,
                token_probability_approve: 92,
                context_similarity: 88,
                temperature_setting: 0,
                semantic_coherence: 91,
                logical_consistency: 93,
                rule_compliance: 96,
                decision_entropy: 12,
                confidence_variance: 5,
                output_token_count: 3,
                decision_logit_diff: 78,
                rule_match_score: 94,
                uncertainty_score: 8
            },
            context: 'Complete workflow test'
        });
        
        const sessionId = zkmlResponse.data.sessionId;
        console.log('   Session ID:', sessionId);
        
        // Poll for completion
        let zkmlProof = null;
        for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusResponse = await axios.get(`${ZKML_BACKEND}/zkml/status/${sessionId}`);
            
            if (statusResponse.data.status === 'completed') {
                zkmlProof = statusResponse.data.proof;
                break;
            } else if (statusResponse.data.status === 'failed') {
                throw new Error('zkML proof generation failed');
            }
        }
        
        if (!zkmlProof) {
            throw new Error('zkML proof generation timed out');
        }
        
        console.log('   ✅ zkML proof generated');
        console.log('   Decision:', zkmlProof.decision === 1 ? 'APPROVE' : 'DENY');
        console.log('   Framework:', zkmlProof.framework);
        console.log('   Hash:', zkmlProof.hash ? zkmlProof.hash.substring(0, 10) + '...' : 'N/A');
        
        // Step 2: On-chain verification
        console.log('\n🔗 Step 2: On-Chain Verification...');
        
        const groth16Response = await axios.post(`${GROTH16_BACKEND}/groth16/workflow`, {
            proofHash: zkmlProof.hash || '0x' + Buffer.from(zkmlProof.proof_bytes || '').toString('hex').substring(0, 64),
            decision: zkmlProof.decision || 1,
            confidence: 95,
            amount: 2.0
        });
        
        if (!groth16Response.data.success) {
            throw new Error('On-chain verification failed');
        }
        
        console.log('   ✅ Verified on-chain');
        console.log('   Block:', groth16Response.data.blockNumber);
        console.log('   Contract:', groth16Response.data.contractAddress);
        console.log('   View:', groth16Response.data.contractUrl);
        
        // Step 3: Circle Gateway (simulated)
        console.log('\n💰 Step 3: Circle Gateway Payment...');
        console.log('   This step would trigger actual USDC transfers');
        console.log('   For demo purposes, we simulate the payment');
        console.log('   Amount: 4.00 USDC (2.00 per chain)');
        console.log('   Chains: Ethereum Sepolia, Base Sepolia');
        
        // Simulate payment
        const paymentResult = {
            success: true,
            attestations: [
                { chain: 'ethereum-sepolia', amount: '2.00 USDC', status: 'completed' },
                { chain: 'base-sepolia', amount: '2.00 USDC', status: 'completed' }
            ],
            totalAmount: '4.00 USDC'
        };
        
        console.log('   ✅ Payment simulated successfully');
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ COMPLETE WORKFLOW SUCCESS!');
        console.log('='.repeat(50));
        console.log('\n📋 Summary:');
        console.log('   1. zkML Proof: Generated with JOLT-Atlas');
        console.log('   2. On-Chain: Verified on Ethereum Sepolia');
        console.log('   3. Payment: 4.00 USDC transferred (simulated)');
        console.log('\n🔗 Verification Contract:');
        console.log(`   ${groth16Response.data.contractUrl}`);
        console.log('\n📝 Note: This uses a simplified circuit (2 params)');
        console.log('   Future: Can validate all 14 LLM parameters');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Workflow failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n⚠️  Make sure backends are running:');
            console.log('   1. node api/zkml-llm-decision-backend.js');
            console.log('   2. node api/groth16-jolt-backend.js');
        }
        
        return false;
    }
}

// Run test
runCompleteWorkflow().then(success => {
    process.exit(success ? 0 : 1);
});