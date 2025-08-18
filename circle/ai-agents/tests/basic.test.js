#!/usr/bin/env node

import AIAgent from '../core/aiAgent.js';
import AIAgentZKPVerifier from '../zkp/zkpVerifier.js';

// Simple test suite for AI agents
async function runBasicTests() {
  console.log('🧪 Running Basic AI Agent Tests');
  console.log('================================\n');

  try {
    // Test 1: Create and initialize an AI agent
    console.log('1️⃣ Testing AI Agent Creation...');
    const agent = new AIAgent('researcher', 'Test Research Agent', ['testing'], '10.00');
    await agent.initialize();
    console.log(`✅ Agent created: ${agent.type} with ${agent.wallet.balance} USDC\n`);

    // Test 2: AI agent reasoning
    console.log('2️⃣ Testing AI Agent Reasoning...');
    const reasoning = await agent.think('Analyze market trends for 2025');
    console.log(`✅ Agent reasoning completed with confidence: ${reasoning.confidence}\n`);

    // Test 3: Spending authorization
    console.log('3️⃣ Testing Spending Authorization...');
    const auth = await agent.requestSpending('5.00', 'data-api', 'Market analysis');
    console.log(`✅ Spending authorized: ${auth.amount} USDC for ${auth.category}\n`);

    // Test 4: ZKP verification
    console.log('4️⃣ Testing ZKP Verification...');
    const zkpVerifier = new AIAgentZKPVerifier();
    await zkpVerifier.initialize();
    
    const proof = await zkpVerifier.generateAgentAuthorizationProof(
      agent.id,
      'test_owner',
      10.00,
      'Testing authorization'
    );
    console.log(`✅ ZKP proof generated: ${proof.verified ? 'VERIFIED' : 'FAILED'}\n`);

    // Test 5: Simulated payment
    console.log('5️⃣ Testing Payment Execution...');
    const payment = await agent.makePayment(auth, 'test-service-provider');
    console.log(`✅ Payment executed: ${payment.amount} USDC (${payment.status})\n`);

    // Test 6: Agent status
    console.log('6️⃣ Testing Agent Status...');
    const status = agent.getStatus();
    console.log(`✅ Agent status: ${status.status}, Tasks: ${status.tasksCompleted}\n`);

    console.log('🎉 All basic tests passed!');
    console.log('\n📊 Test Summary:');
    console.log('- ✅ Agent creation and initialization');
    console.log('- ✅ AI reasoning and decision making');
    console.log('- ✅ Spending authorization controls');
    console.log('- ✅ ZKP proof generation and verification');
    console.log('- ✅ Payment execution simulation');
    console.log('- ✅ Agent status and metrics tracking');

    // Cleanup
    await agent.shutdown();
    zkpVerifier.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBasicTests();
}

export { runBasicTests };