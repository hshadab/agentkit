#!/usr/bin/env node

import AIAgentZKPVerifier from './zkp/zkpVerifier.js';

async function testSingleAgent() {
  console.log('🧪 Testing Single AI Agent with zkEngine Integration');
  console.log('===================================================\n');
  
  const zkpVerifier = new AIAgentZKPVerifier();
  
  try {
    // Initialize ZKP verifier
    await zkpVerifier.initialize();
    console.log('✅ ZKP Verifier initialized\n');
    
    // Test agent authorization proof
    console.log('🔐 Testing agent authorization proof...');
    const authProof = await zkpVerifier.generateAgentAuthorizationProof(
      'test_agent_001',
      'owner_123',
      25.00,
      'research data acquisition'
    );
    
    console.log('✅ Agent authorization proof generated:');
    console.log(`  - Verified: ${authProof.verified}`);
    console.log(`  - Proof ID: ${authProof.proofId}`);
    console.log(`  - zkEngine: ${authProof.zkEngine}`);
    if (authProof.metrics) {
      console.log(`  - Generation time: ${authProof.metrics.generation_time_secs}s`);
      console.log(`  - Proof size: ${authProof.metrics.proof_size} bytes`);
    }
    
    console.log('\n🎉 Single agent test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    zkpVerifier.disconnect();
  }
}

testSingleAgent();