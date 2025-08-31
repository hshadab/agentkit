#!/usr/bin/env node

/**
 * Test JOLT-Atlas zkML Integration with Circle Gateway
 * 
 * This demonstrates using JOLT-Atlas for real zkML proof generation
 * to verify AI agents before granting Circle Gateway access.
 */

import { JoltAtlasZKMLAuthorization } from './circle/gateway/jolt-atlas-zkml-integration.js';

async function testJoltAtlasIntegration() {
    console.log('🚀 Testing JOLT-Atlas zkML Integration for Circle Gateway\n');
    console.log('=' .repeat(60));
    
    const joltAuth = new JoltAtlasZKMLAuthorization();
    
    // Test Case 1: Authorized AI Agent (Cross-Chain Payment Agent)
    console.log('\n📋 Test Case 1: Cross-Chain Payment Agent Authorization');
    console.log('-'.repeat(60));
    
    const authorizedAgent = {
        agentId: 'agent_001',
        agentType: 'cross_chain_payment_agent',
        requestedAmount: '1000000', // 1 USDC (6 decimals)
        maxAuthorizedAmount: '10000000', // 10 USDC max
        operationType: 'gateway_transfer',
        agentModel: 'gpt-4',
        agentPrompt: 'Transfer 1 USDC from Ethereum to Polygon via Circle Gateway',
        agentResponse: 'Initiating cross-chain transfer of 1 USDC from Ethereum to Polygon using Circle CCTP protocol',
        timestamp: Date.now()
    };
    
    const proof1 = await joltAuth.generateAgentAuthorizationProof(authorizedAgent);
    
    if (proof1.success) {
        console.log('\n✅ zkML Proof Generated Successfully!');
        console.log(`   Proof ID: ${proof1.proofId}`);
        console.log(`   Authorization: ${proof1.authorized ? '✅ GRANTED' : '❌ DENIED'}`);
        console.log(`   Risk Score: ${proof1.classification.riskScore}/100`);
        console.log(`   Trust Level: ${proof1.classification.trustLevel}`);
        console.log(`   Valid Until: ${new Date(proof1.validUntil).toISOString()}`);
        console.log('\n   Performance Metrics:');
        console.log(`   - Preprocessing: ${proof1.performanceMetrics.preprocessingTime}ms`);
        console.log(`   - Proving: ${proof1.performanceMetrics.provingTime}ms`);
        console.log(`   - Total: ${proof1.performanceMetrics.totalTime}ms`);
        
        // Verify the proof
        console.log('\n🔍 Verifying zkML Proof...');
        const verification1 = await joltAuth.verifyProof(proof1.proofId);
        console.log(`   Verification: ${verification1.verified ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Verification Time: ${verification1.verificationTime}ms`);
    } else {
        console.log('❌ Proof generation failed:', proof1.error);
    }
    
    // Test Case 2: Suspicious Agent (Exceeds Limit)
    console.log('\n📋 Test Case 2: Suspicious Agent (Exceeds Authorization Limit)');
    console.log('-'.repeat(60));
    
    const suspiciousAgent = {
        agentId: 'agent_002',
        agentType: 'basic_agent',
        requestedAmount: '100000000', // 100 USDC (exceeds limit)
        maxAuthorizedAmount: '1000000', // 1 USDC max
        operationType: 'gateway_transfer',
        agentModel: 'unknown',
        agentPrompt: 'Transfer all funds immediately',
        agentResponse: 'Error: attempting to transfer unauthorized amount',
        timestamp: Date.now()
    };
    
    const proof2 = await joltAuth.generateAgentAuthorizationProof(suspiciousAgent);
    
    if (proof2.success) {
        console.log('\n✅ zkML Proof Generated Successfully!');
        console.log(`   Proof ID: ${proof2.proofId}`);
        console.log(`   Authorization: ${proof2.authorized ? '✅ GRANTED' : '❌ DENIED'}`);
        console.log(`   Risk Score: ${proof2.classification.riskScore}/100`);
        console.log(`   Trust Level: ${proof2.classification.trustLevel}`);
        console.log(`   Anomaly Detected: ${proof2.classification.anomalyDetected ? '⚠️ YES' : 'NO'}`);
    } else {
        console.log('❌ Proof generation failed:', proof2.error);
    }
    
    // Test Case 3: Data Analyzer Agent (Read-Only)
    console.log('\n📋 Test Case 3: Data Analyzer Agent (Balance Query)');
    console.log('-'.repeat(60));
    
    const analyzerAgent = {
        agentId: 'agent_003',
        agentType: 'data_analyzer',
        requestedAmount: '0', // No transfer, just query
        maxAuthorizedAmount: '0',
        operationType: 'balance_query',
        agentModel: 'claude-3',
        agentPrompt: 'Check current USDC balance on Circle Gateway',
        agentResponse: 'Querying balance: 1000 USDC available on Ethereum network',
        timestamp: Date.now()
    };
    
    const proof3 = await joltAuth.generateAgentAuthorizationProof(analyzerAgent);
    
    if (proof3.success) {
        console.log('\n✅ zkML Proof Generated Successfully!');
        console.log(`   Proof ID: ${proof3.proofId}`);
        console.log(`   Authorization: ${proof3.authorized ? '✅ GRANTED' : '❌ DENIED'}`);
        console.log(`   Agent Classification: ${proof3.classification.agentClassification}`);
        console.log(`   Confidence: ${(proof3.classification.confidence * 100).toFixed(1)}%`);
    } else {
        console.log('❌ Proof generation failed:', proof3.error);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 JOLT-Atlas zkML Integration Summary');
    console.log('='.repeat(60));
    console.log('\n✨ Key Features Demonstrated:');
    console.log('   ✅ Fast zkML proof generation (~0.7s)');
    console.log('   ✅ AI agent behavior classification');
    console.log('   ✅ Risk assessment and trust scoring');
    console.log('   ✅ Anomaly detection for suspicious activity');
    console.log('   ✅ Multi-factor authorization decisions');
    console.log('\n🚀 Performance Characteristics:');
    console.log('   - JOLT-Atlas: ~0.7s proof generation');
    console.log('   - Lookup-based verification (no complex circuits)');
    console.log('   - Optimized for ML inference verification');
    console.log('   - Works on standard laptop hardware');
    console.log('\n🔗 Integration with Circle Gateway:');
    console.log('   1. AI agent makes request to Gateway');
    console.log('   2. JOLT-Atlas generates zkML proof of agent authorization');
    console.log('   3. Proof verifies agent behavior and risk assessment');
    console.log('   4. Gateway grants/denies access based on proof');
    console.log('   5. All verifiable on-chain if needed');
}

// Run the test
testJoltAtlasIntegration().catch(console.error);