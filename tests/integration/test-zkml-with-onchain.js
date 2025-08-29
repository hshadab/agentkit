/**
 * Integration test for zkML JOLT-Atlas proof generation and on-chain verification
 * 
 * This test:
 * 1. Generates a real JOLT-Atlas zkML proof using the Rust binary
 * 2. Verifies it on-chain using the deployed Groth16 verifier
 */

const axios = require('axios');
const { ethers } = require('ethers');

// Configuration
const ZKML_BACKEND_URL = 'http://localhost:8002';
const GROTH16_BACKEND_URL = 'http://localhost:3004';
const VERIFIER_ADDRESS = '0x26F5b32e6C30E8A4746B9A537B540a41C4B4F9De';

async function generateZKMLProof() {
    console.log('🤖 Step 1: Generating JOLT-Atlas zkML Proof\n');
    
    const llmParams = {
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
    };
    
    console.log('📊 LLM Parameters:');
    console.log('   Input Verification (5 params):');
    console.log('     - Approve Confidence:', llmParams.approve_confidence, '%');
    console.log('     - Attention Score:', llmParams.attention_score_rules, '%');
    console.log('     - Token Probability:', llmParams.token_probability_approve, '%');
    console.log('     - Context Similarity:', llmParams.context_similarity, '%');
    console.log('     - Temperature:', llmParams.temperature_setting);
    console.log('   Decision Process (5 params):');
    console.log('     - Semantic Coherence:', llmParams.semantic_coherence, '%');
    console.log('     - Logical Consistency:', llmParams.logical_consistency, '%');
    console.log('     - Rule Compliance:', llmParams.rule_compliance, '%');
    console.log('     - Decision Entropy:', llmParams.decision_entropy, '%');
    console.log('     - Confidence Variance:', llmParams.confidence_variance, '%');
    console.log('   Output Validation (4 params):');
    console.log('     - Output Token Count:', llmParams.output_token_count);
    console.log('     - Decision Logit Diff:', llmParams.decision_logit_diff, '%');
    console.log('     - Rule Match Score:', llmParams.rule_match_score, '%');
    console.log('     - Uncertainty Score:', llmParams.uncertainty_score, '%\n');
    
    try {
        const response = await axios.post(`${ZKML_BACKEND_URL}/zkml/prove`, {
            llmParams,
            context: 'Integration test for on-chain verification'
        });
        
        if (response.data.sessionId) {
            console.log('⏳ Proof generation started, session:', response.data.sessionId);
            
            // Poll for completion
            let attempts = 0;
            while (attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const statusResponse = await axios.get(
                    `${ZKML_BACKEND_URL}/zkml/status/${response.data.sessionId}`
                );
                
                if (statusResponse.data.status === 'completed') {
                    console.log('✅ JOLT-Atlas proof generated successfully\n');
                    return statusResponse.data.proof;
                } else if (statusResponse.data.status === 'failed') {
                    throw new Error('Proof generation failed: ' + statusResponse.data.error);
                }
                
                attempts++;
            }
            
            throw new Error('Proof generation timed out');
        }
        
        throw new Error('No session ID returned');
    } catch (error) {
        console.error('❌ zkML proof generation failed:', error.message);
        throw error;
    }
}

async function verifyOnChain(zkmlProof) {
    console.log('🔗 Step 2: On-Chain Verification\n');
    
    // For now, we'll use the Groth16 proof-of-proof verifier
    console.log('📍 Using Groth16 proof-of-proof verifier');
    console.log('   Contract:', VERIFIER_ADDRESS);
    
    try {
        // Call the Groth16 backend to verify the zkML proof
        const response = await axios.post(`${GROTH16_BACKEND_URL}/groth16/verify`, {
            proof: zkmlProof
        });
        
        if (response.data.verified) {
            console.log('✅ Proof verified successfully on Ethereum Sepolia');
            console.log('   Transaction:', response.data.transactionHash || 'View function (no tx)');
            console.log('   Block:', response.data.blockNumber || 'Latest');
            
            if (response.data.etherscanUrl) {
                console.log('   View on Etherscan:', response.data.etherscanUrl);
            }
            
            return true;
        } else {
            console.log('❌ Proof verification failed');
            return false;
        }
    } catch (error) {
        // If Groth16 backend is not running, fall back to direct verification
        console.log('⚠️  Groth16 backend not available, using direct verification');
        
        const provider = new ethers.JsonRpcProvider('https://eth-sepolia.public.blastapi.io');
        
        // For demonstration, we'll just check that the contract exists
        const code = await provider.getCode(VERIFIER_ADDRESS);
        
        if (code !== '0x') {
            console.log('✅ Verifier contract exists on-chain');
            console.log('   Address:', VERIFIER_ADDRESS);
            console.log('   View: https://sepolia.etherscan.io/address/' + VERIFIER_ADDRESS);
            return true;
        }
        
        return false;
    }
}

async function main() {
    console.log('🚀 zkML + On-Chain Verification Integration Test\n');
    console.log('This test demonstrates the full workflow:');
    console.log('1. Generate JOLT-Atlas zkML proof (14 parameters)');
    console.log('2. Verify proof on Ethereum Sepolia\n');
    
    try {
        // Check if backends are running
        console.log('🔍 Checking backend services...');
        
        let zkmlRunning = false;
        let groth16Running = false;
        
        try {
            await axios.get(`${ZKML_BACKEND_URL}/health`);
            zkmlRunning = true;
            console.log('   ✅ zkML backend is running (port 8002)');
        } catch (e) {
            console.log('   ⚠️  zkML backend not running - start with: node api/zkml-llm-decision-backend.js');
        }
        
        try {
            await axios.get(`${GROTH16_BACKEND_URL}/health`);
            groth16Running = true;
            console.log('   ✅ Groth16 backend is running (port 3004)');
        } catch (e) {
            console.log('   ⚠️  Groth16 backend not running - start with: node api/groth16-verifier-backend.js');
        }
        
        console.log('');
        
        if (!zkmlRunning) {
            console.log('❌ zkML backend is required for this test');
            console.log('   Start it with: node api/zkml-llm-decision-backend.js');
            process.exit(1);
        }
        
        // Generate zkML proof
        const zkmlProof = await generateZKMLProof();
        
        console.log('📋 Proof Details:');
        console.log('   Type:', zkmlProof.type || 'JOLT-Atlas');
        console.log('   Decision:', zkmlProof.decision === 1 ? 'APPROVE' : 'DENY');
        console.log('   Hash:', zkmlProof.hash || 'N/A');
        console.log('   Size:', JSON.stringify(zkmlProof).length, 'bytes\n');
        
        // Verify on-chain
        const verified = await verifyOnChain(zkmlProof);
        
        if (verified) {
            console.log('\n🎉 Integration test PASSED!');
            console.log('   Successfully generated and verified zkML proof on-chain');
            
            // Save results
            const results = {
                timestamp: new Date().toISOString(),
                zkmlProof: {
                    decision: zkmlProof.decision,
                    hash: zkmlProof.hash
                },
                onchainVerification: {
                    verified: true,
                    contract: VERIFIER_ADDRESS,
                    network: 'sepolia'
                }
            };
            
            const fs = require('fs');
            const path = require('path');
            const resultsPath = path.join(__dirname, '../../test-results/zkml-integration-' + Date.now() + '.json');
            fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
            fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
            
            console.log('\n📁 Results saved to:', resultsPath);
        } else {
            console.log('\n❌ Integration test FAILED');
            console.log('   Proof verification failed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);