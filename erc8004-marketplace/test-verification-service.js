/**
 * Test zkML Agent Verification Service
 *
 * This tests the complete flow:
 * 1. Agent submits 3 test cases
 * 2. Service generates Groth16 proof
 * 3. Service verifies proof on-chain
 * 4. Agent receives verification credential
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:9002';

async function testVerificationService() {
  console.log('\n' + '='.repeat(70));
  console.log('          zkML AGENT VERIFICATION SERVICE TEST');
  console.log('='.repeat(70));

  // Example: Budget Management Agent
  const testRequest = {
    agentName: 'BudgetGuardian AI',
    agentDescription: 'Prevents overspending by checking budget limits',

    // 3 Test Cases
    testInputs: [12345, 67890, 11111],  // Hashes of test scenarios
    expectedOutputs: [98765, 43210, 22222],  // Expected agent responses
    actualOutputs: [98765, 43210, 22222],  // Actual agent responses (match = verified)

    // Agent model hash (unique identifier)
    agentModelHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  };

  console.log('\n📋 Test Request:');
  console.log(`   Agent: ${testRequest.agentName}`);
  console.log(`   Description: ${testRequest.agentDescription}`);
  console.log(`   Test Inputs: [${testRequest.testInputs.join(', ')}]`);
  console.log(`   Expected: [${testRequest.expectedOutputs.join(', ')}]`);
  console.log(`   Actual: [${testRequest.actualOutputs.join(', ')}]`);
  console.log(`   Model Hash: ${testRequest.agentModelHash}`);

  try {
    console.log('\n🚀 Sending verification request...');

    const response = await axios.post(`${BACKEND_URL}/verify-agent`, testRequest);

    if (response.data.success) {
      console.log('\n✅ VERIFICATION SUCCESSFUL!');
      console.log('\n🎖️  Verification Credential:');
      console.log(`   ID: ${response.data.verificationId}`);
      console.log(`   Agent: ${response.data.agentName}`);
      console.log(`   Tests Passed: ${response.data.testCasesPassed}/3`);
      console.log(`   All Passed: ${response.data.allTestsPassed}`);
      console.log(`   Verified At: ${response.data.verifiedAt}`);
      console.log(`   Network: ${response.data.verifierNetwork}`);
      console.log(`   Chain ID: ${response.data.verifierChainId}`);
      console.log(`   Verifier Contract: ${response.data.verifierContract}`);
      console.log(`   Explorer: ${response.data.explorerUrl}`);
      console.log(`   Proof Hash: ${response.data.proof.proofHash}`);

      console.log('\n📊 Public Signals:');
      console.log(`   [${response.data.proof.publicSignals.join(', ')}]`);

      console.log('\n' + '='.repeat(70));
      console.log('🎉 Test Passed! Agent is now zkML Verified');
      console.log('='.repeat(70));
      console.log('\nAgent can now display this verification badge:');
      console.log(`✅ zkML Verified (ID: ${response.data.verificationId.substring(0, 16)}...)`);
      console.log(`   Verifier: Base Sepolia ${response.data.verifierContract}`);
      console.log(`   View on Explorer: ${response.data.explorerUrl}\n`);

      // Test credential retrieval
      console.log('\n🔍 Testing credential retrieval...');
      const credResponse = await axios.get(`${BACKEND_URL}/verification/${response.data.verificationId}`);

      if (credResponse.data.success) {
        console.log('✅ Credential retrieval successful!');
        console.log(`   Agent: ${credResponse.data.agentName}`);
      }

    } else {
      console.error('\n❌ Verification failed:', response.data.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    console.error('\nMake sure the backend is running on port 9002:');
    console.error('  cd /home/hshadab/agentkit/erc8004-zkml-auditor');
    console.error('  node backend/zkml-auditor-backend.js');
    process.exit(1);
  }
}

// Run test
testVerificationService()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
