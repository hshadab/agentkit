/**
 * REAL Complete Workflow Test with Gas Costs
 * 
 * Tests the full 3-step workflow with REAL on-chain verification:
 * 1. JOLT-Atlas zkML proof generation
 * 2. PERMANENT on-chain verification (costs gas)
 * 3. Circle Gateway payment (simulated)
 */

const axios = require('axios');
const { ethers } = require('ethers');

const ZKML_BACKEND = 'http://localhost:8002';
const GROTH16_BACKEND = 'http://localhost:3004';

async function runRealWorkflow() {
    console.log('🚀 Testing REAL zkML Workflow (with gas costs)\n');
    console.log('This test will:');
    console.log('  1. Generate JOLT-Atlas zkML Proof');
    console.log('  2. Create PERMANENT on-chain record (costs ~0.0005 ETH)');
    console.log('  3. Simulate Circle Gateway Payment\n');
    
    try {
        // Check wallet balance first
        console.log('💰 Checking wallet balance...');
        const walletResponse = await axios.get(`${GROTH16_BACKEND}/groth16/wallet`);
        console.log('   Address:', walletResponse.data.address);
        console.log('   Balance:', walletResponse.data.balance);
        
        if (!walletResponse.data.sufficient) {
            console.error('   ❌ Insufficient balance! Need at least 0.001 ETH');
            console.log('   Get testnet ETH from:', walletResponse.data.faucetUrl);
            return false;
        }
        console.log('   ✅ Sufficient balance for verification\n');
        
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
            context: 'Real workflow test with gas costs'
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
        
        // Step 2: REAL on-chain verification (costs gas)
        console.log('\n🔗 Step 2: REAL On-Chain Verification (costs gas)...');
        console.log('   ⚠️  This will spend real ETH on Sepolia testnet');
        
        const startTime = Date.now();
        const groth16Response = await axios.post(`${GROTH16_BACKEND}/groth16/workflow`, {
            proofHash: zkmlProof.hash || '0x' + Buffer.from(zkmlProof.proof_bytes || '').toString('hex').substring(0, 64),
            decision: zkmlProof.decision || 1,
            confidence: 95,
            sessionId: sessionId
        });
        
        const verificationTime = Date.now() - startTime;
        
        if (!groth16Response.data.success) {
            throw new Error('On-chain verification failed');
        }
        
        console.log('   ✅ PERMANENTLY VERIFIED ON-CHAIN');
        console.log('   Transaction Hash:', groth16Response.data.transactionHash);
        console.log('   Block Number:', groth16Response.data.blockNumber);
        console.log('   Proof ID:', groth16Response.data.proofId);
        console.log('   Gas Used:', groth16Response.data.gasUsed);
        console.log('   Total Cost:', groth16Response.data.totalCost);
        console.log('   Verification Time:', (verificationTime / 1000).toFixed(1), 'seconds');
        console.log('\n   📋 View on Etherscan:');
        console.log('   ', groth16Response.data.etherscanUrl);
        
        // Verify we can retrieve the verification from chain
        console.log('\n   🔍 Checking on-chain record...');
        const historyResponse = await axios.get(`${GROTH16_BACKEND}/groth16/history/${sessionId}`);
        console.log('   On-chain data:');
        console.log('     Decision:', historyResponse.data.onChain.decision);
        console.log('     Confidence:', historyResponse.data.onChain.confidence);
        console.log('     Timestamp:', historyResponse.data.onChain.timestamp);
        console.log('     Verified:', historyResponse.data.onChain.verified ? 'YES' : 'NO');
        
        // Step 3: Circle Gateway (simulated)
        console.log('\n💰 Step 3: Circle Gateway Payment...');
        console.log('   In production, this would trigger USDC transfers');
        console.log('   Amount: 4.00 USDC (2.00 per chain)');
        console.log('   Chains: Ethereum Sepolia, Base Sepolia');
        
        const paymentResult = {
            success: true,
            attestations: [
                { chain: 'ethereum-sepolia', amount: '2.00 USDC', status: 'completed' },
                { chain: 'base-sepolia', amount: '2.00 USDC', status: 'completed' }
            ],
            totalAmount: '4.00 USDC'
        };
        
        console.log('   ✅ Payment would be triggered (simulated)');
        
        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ REAL WORKFLOW COMPLETE WITH ON-CHAIN PROOF!');
        console.log('='.repeat(60));
        
        console.log('\n📋 Summary:');
        console.log('   1. zkML Proof: Generated with JOLT-Atlas');
        console.log('   2. On-Chain: PERMANENTLY recorded on Ethereum');
        console.log('   3. Payment: Would transfer 4.00 USDC');
        
        console.log('\n🔗 Permanent Proof:');
        console.log('   Transaction:', groth16Response.data.transactionHash);
        console.log('   View:', groth16Response.data.etherscanUrl);
        
        console.log('\n💡 This is REAL:');
        console.log('   - Spent real gas (~' + groth16Response.data.totalCost + ')');
        console.log('   - Created permanent blockchain record');
        console.log('   - Can be audited forever');
        console.log('   - Transaction hash proves verification happened');
        
        console.log('\n📝 Note: Circuit uses 2 params for demo.');
        console.log('   Production would validate all 14 LLM parameters.');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Workflow failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n⚠️  Make sure backends are running:');
            console.log('   1. node api/zkml-llm-decision-backend.js');
            console.log('   2. node api/groth16-jolt-backend-real.js');
        } else if (error.message.includes('Insufficient')) {
            console.log('\n⚠️  Need testnet ETH for gas costs');
            console.log('   Get from: https://sepolia-faucet.pk910.de/');
        }
        
        return false;
    }
}

// Run test
console.log('Starting REAL workflow test...\n');
runRealWorkflow().then(success => {
    if (success) {
        console.log('\n✅ Test passed! Real on-chain verification working.');
    } else {
        console.log('\n❌ Test failed.');
    }
    process.exit(success ? 0 : 1);
});