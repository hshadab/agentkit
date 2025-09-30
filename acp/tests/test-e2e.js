/**
 * End-to-End Test for ACP × JOLT-Atlas Integration
 * Tests complete workflow: Proof Generation → Payment → Verification
 */

const axios = require('axios');

const PROOF_SERVICE = 'http://localhost:9001';
const ACP_SERVICE = 'http://localhost:9002';
const VERIFICATION_SERVICE = 'http://localhost:9003';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkService(url, name) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 2000 });
    log(colors.green, `✅ ${name} is healthy`);
    return true;
  } catch (error) {
    log(colors.red, `❌ ${name} is not responding`);
    return false;
  }
}

async function testProofGeneration() {
  log(colors.cyan, '\n🧪 Test 1: Proof Generation');
  log(colors.cyan, '=' .repeat(50));

  const userRules = {
    daily_limit: 500,
    per_transaction_max: 100,
    allowed_categories: ['groceries', 'utilities'],
    trusted_merchants: {
      'merchant_123': 0.95,
      'merchant_456': 0.75
    },
    spent_today: 150,
    transactions_today: 3
  };

  const transaction = {
    merchant_id: 'merchant_123',
    amount: 45.00,
    category: 'groceries'
  };

  try {
    const startTime = Date.now();
    const response = await axios.post(`${PROOF_SERVICE}/prove-authorization`, {
      user_rules: userRules,
      transaction: transaction
    });

    const latency = Date.now() - startTime;

    if (response.data.success) {
      log(colors.green, '✅ Proof generated successfully');
      console.log(`   Decision: ${response.data.decision ? 'AUTHORIZED' : 'DENIED'}`);
      console.log(`   Confidence: ${(response.data.confidence * 100).toFixed(2)}%`);
      console.log(`   Processing time: ${response.data.processing_time_ms}ms`);
      console.log(`   Total latency: ${latency}ms`);
      console.log(`   Proof hash: ${response.data.proof_hash?.substring(0, 16)}...`);
      return response.data;
    } else {
      log(colors.red, '❌ Proof generation failed');
      return null;
    }
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return null;
  }
}

async function testProofVerification(proofData) {
  log(colors.cyan, '\n🧪 Test 2: Proof Verification');
  log(colors.cyan, '='.repeat(50));

  if (!proofData) {
    log(colors.yellow, '⚠️  Skipping (no proof data)');
    return null;
  }

  try {
    const startTime = Date.now();
    const response = await axios.post(`${VERIFICATION_SERVICE}/verify`, {
      proof: proofData.proof,
      model_hash: proofData.model_hash,
      inputs_hash: proofData.inputs_hash,
      expected_decision: proofData.decision
    });

    const latency = Date.now() - startTime;

    if (response.data.success && response.data.valid) {
      log(colors.green, '✅ Proof verified successfully');
      console.log(`   Verification time: ${response.data.verification_time_ms}ms`);
      console.log(`   Total latency: ${latency}ms`);
      console.log(`   Cached: ${response.data.cached}`);
      return response.data;
    } else {
      log(colors.red, '❌ Proof verification failed');
      console.log(`   Reason: ${response.data.reason}`);
      return null;
    }
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return null;
  }
}

async function testACPPayment(proofData) {
  log(colors.cyan, '\n🧪 Test 3: ACP Payment with Proof');
  log(colors.cyan, '='.repeat(50));

  if (!proofData) {
    log(colors.yellow, '⚠️  Skipping (no proof data)');
    return null;
  }

  try {
    const startTime = Date.now();
    const response = await axios.post(`${ACP_SERVICE}/checkout`, {
      merchant_id: 'merchant_123',
      amount: 45.00,
      currency: 'USD',
      payment_token: 'stripe_test_token_12345',
      authorization_proof: {
        proof: proofData.proof,
        proof_hash: proofData.proof_hash,
        session_id: proofData.session_id,
        model_hash: proofData.model_hash,
        inputs_hash: proofData.inputs_hash,
        decision: proofData.decision,
        confidence: proofData.confidence,
        timestamp: proofData.timestamp
      }
    });

    const latency = Date.now() - startTime;

    if (response.data.success) {
      log(colors.green, '✅ Payment created successfully');
      console.log(`   Payment ID: ${response.data.payment.payment_id}`);
      console.log(`   Status: ${response.data.payment.status}`);
      console.log(`   Latency: ${latency}ms`);
      return response.data.payment;
    } else {
      log(colors.red, '❌ Payment creation failed');
      return null;
    }
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return null;
  }
}

async function testIntegratedCheckout() {
  log(colors.cyan, '\n🧪 Test 4: Integrated Checkout (Proof + Payment)');
  log(colors.cyan, '='.repeat(50));

  const userRules = {
    daily_limit: 500,
    per_transaction_max: 100,
    allowed_categories: ['groceries', 'utilities'],
    trusted_merchants: {
      'merchant_789': 0.88
    },
    spent_today: 200,
    transactions_today: 5
  };

  try {
    const startTime = Date.now();
    const response = await axios.post(`${ACP_SERVICE}/checkout/with-proof-generation`, {
      user_rules: userRules,
      merchant_id: 'merchant_789',
      amount: 67.50,
      currency: 'USD',
      category: 'utilities',
      payment_token: 'stripe_test_token_67890'
    });

    const latency = Date.now() - startTime;

    if (response.data.success) {
      log(colors.green, '✅ Integrated checkout successful');
      console.log(`   Payment ID: ${response.data.payment.payment_id}`);
      console.log(`   Decision: ${response.data.proof_details.decision ? 'AUTHORIZED' : 'DENIED'}`);
      console.log(`   Confidence: ${(response.data.proof_details.confidence * 100).toFixed(2)}%`);
      console.log(`   Proof generation: ${response.data.proof_details.processing_time_ms}ms`);
      console.log(`   Total latency: ${latency}ms`);
      return response.data;
    } else {
      log(colors.red, '❌ Integrated checkout failed');
      return null;
    }
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return null;
  }
}

async function testDeniedTransaction() {
  log(colors.cyan, '\n🧪 Test 5: Denied Transaction (Insufficient Budget)');
  log(colors.cyan, '='.repeat(50));

  const userRules = {
    daily_limit: 100,
    per_transaction_max: 50,
    allowed_categories: ['groceries'],
    trusted_merchants: {},
    spent_today: 80, // Only $20 left
    transactions_today: 8
  };

  const transaction = {
    merchant_id: 'merchant_unknown',
    amount: 75.00, // Exceeds remaining budget
    category: 'groceries'
  };

  try {
    const response = await axios.post(`${PROOF_SERVICE}/prove-authorization`, {
      user_rules: userRules,
      transaction: transaction
    });

    if (response.data.success && !response.data.decision) {
      log(colors.green, '✅ Transaction correctly denied');
      console.log(`   Decision: DENIED`);
      console.log(`   Confidence: ${(response.data.confidence * 100).toFixed(2)}%`);
      console.log(`   Reason: ${response.data.reason || 'Agent denied authorization'}`);
      return true;
    } else if (response.data.decision) {
      log(colors.red, '❌ Transaction was authorized but should be denied');
      return false;
    }
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return false;
  }
}

async function testBatchVerification() {
  log(colors.cyan, '\n🧪 Test 6: Batch Proof Verification');
  log(colors.cyan, '='.repeat(50));

  // Generate multiple proofs
  const proofs = [];

  for (let i = 0; i < 5; i++) {
    try {
      const response = await axios.post(`${PROOF_SERVICE}/prove-authorization`, {
        user_rules: {
          daily_limit: 500,
          per_transaction_max: 100,
          allowed_categories: ['groceries'],
          trusted_merchants: { 'merchant_123': 0.9 },
          spent_today: i * 50,
          transactions_today: i
        },
        transaction: {
          merchant_id: 'merchant_123',
          amount: 30 + i * 10,
          category: 'groceries'
        }
      });

      if (response.data.success) {
        proofs.push({
          proof: response.data.proof,
          model_hash: response.data.model_hash,
          inputs_hash: response.data.inputs_hash
        });
      }
    } catch (error) {
      console.error(`Failed to generate proof ${i + 1}`);
    }
  }

  if (proofs.length === 0) {
    log(colors.yellow, '⚠️  No proofs generated, skipping batch test');
    return null;
  }

  try {
    const startTime = Date.now();
    const response = await axios.post(`${VERIFICATION_SERVICE}/verify-batch`, {
      proofs: proofs
    });

    const latency = Date.now() - startTime;

    if (response.data.success) {
      log(colors.green, `✅ Batch verification completed`);
      console.log(`   Verified: ${response.data.verified_count}/${proofs.length}`);
      console.log(`   Failed: ${response.data.failed_count}`);
      console.log(`   Total time: ${response.data.total_time_ms}ms`);
      console.log(`   Average per proof: ${response.data.avg_time_ms.toFixed(2)}ms`);
      return response.data;
    }
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  log(colors.blue, '\n' + '='.repeat(60));
  log(colors.blue, '  ACP × JOLT-Atlas E2E Test Suite');
  log(colors.blue, '='.repeat(60));

  // Check services
  log(colors.cyan, '\n🔍 Checking Services...');
  const proofServiceUp = await checkService(PROOF_SERVICE, 'Proof Service (9001)');
  const acpServiceUp = await checkService(ACP_SERVICE, 'ACP Service (9002)');
  const verificationServiceUp = await checkService(VERIFICATION_SERVICE, 'Verification Service (9003)');

  if (!proofServiceUp || !acpServiceUp || !verificationServiceUp) {
    log(colors.red, '\n❌ Not all services are running. Please start them first:');
    log(colors.yellow, '   npm run start:all');
    process.exit(1);
  }

  // Run tests
  const results = {
    passed: 0,
    failed: 0,
    total: 6
  };

  // Test 1: Proof Generation
  const proofData = await testProofGeneration();
  if (proofData) results.passed++; else results.failed++;

  // Test 2: Proof Verification
  const verificationResult = await testProofVerification(proofData);
  if (verificationResult) results.passed++; else results.failed++;

  // Test 3: ACP Payment
  const paymentResult = await testACPPayment(proofData);
  if (paymentResult) results.passed++; else results.failed++;

  // Test 4: Integrated Checkout
  const integratedResult = await testIntegratedCheckout();
  if (integratedResult) results.passed++; else results.failed++;

  // Test 5: Denied Transaction
  const deniedResult = await testDeniedTransaction();
  if (deniedResult) results.passed++; else results.failed++;

  // Test 6: Batch Verification
  const batchResult = await testBatchVerification();
  if (batchResult) results.passed++; else results.failed++;

  // Summary
  log(colors.blue, '\n' + '='.repeat(60));
  log(colors.blue, '  Test Summary');
  log(colors.blue, '='.repeat(60));
  console.log(`Total: ${results.total}`);
  log(colors.green, `Passed: ${results.passed}`);
  log(colors.red, `Failed: ${results.failed}`);

  const successRate = (results.passed / results.total * 100).toFixed(1);
  if (results.passed === results.total) {
    log(colors.green, `\n✨ All tests passed! (${successRate}%)`);
  } else {
    log(colors.yellow, `\n⚠️  Some tests failed (${successRate}% success rate)`);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(colors.red, `\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});