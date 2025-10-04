/**
 * Agent Behavior Verification Proof Service
 * Generates Groth16 proofs that agents produce expected outputs for test inputs
 */

const snarkjs = require('snarkjs');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');

const WASM_PATH = path.join(__dirname, '../circuits/build/AgentBehaviorVerification_js/AgentBehaviorVerification.wasm');
const ZKEY_PATH = path.join(__dirname, '../circuits/build/agent_behavior_0001.zkey');

/**
 * Generate behavior verification proof
 * @param {Object} params
 * @param {number[]} params.testInputs - Array of 3 test input hashes
 * @param {number[]} params.expectedOutputs - Array of 3 expected output hashes
 * @param {number[]} params.actualOutputs - Array of 3 actual output hashes
 * @param {string} params.agentModelHash - bytes32 hash of agent model
 * @returns {Promise<{proof, publicSignals}>}
 */
async function generateBehaviorProof(params) {
  const { testInputs, expectedOutputs, actualOutputs, agentModelHash } = params;

  console.log('\n🔍 Generating Agent Behavior Verification Proof');
  console.log('================================================');

  // Validate inputs
  if (!testInputs || testInputs.length !== 3) {
    throw new Error('testInputs must be an array of 3 values');
  }
  if (!expectedOutputs || expectedOutputs.length !== 3) {
    throw new Error('expectedOutputs must be an array of 3 values');
  }
  if (!actualOutputs || actualOutputs.length !== 3) {
    throw new Error('actualOutputs must be an array of 3 values');
  }
  if (!agentModelHash) {
    throw new Error('agentModelHash is required');
  }

  // Convert model hash to field element if it's a hex string
  let modelHashField;
  if (typeof agentModelHash === 'string' && agentModelHash.startsWith('0x')) {
    // Convert bytes32 to BigInt, then to string for circom
    modelHashField = BigInt(agentModelHash).toString();
  } else {
    modelHashField = agentModelHash.toString();
  }

  // Prepare circuit inputs
  const input = {
    testInput: testInputs.map(x => x.toString()),
    expectedOutput: expectedOutputs.map(x => x.toString()),
    actualOutput: actualOutputs.map(x => x.toString()),
    agentModelHash: modelHashField
  };

  console.log('\nCircuit Inputs:');
  console.log(`  Test Inputs: [${testInputs.join(', ')}]`);
  console.log(`  Expected: [${expectedOutputs.join(', ')}]`);
  console.log(`  Actual: [${actualOutputs.join(', ')}]`);
  console.log(`  Model Hash: ${agentModelHash}\n`);

  // Check if files exist
  if (!fs.existsSync(WASM_PATH)) {
    throw new Error(`WASM file not found: ${WASM_PATH}`);
  }
  if (!fs.existsSync(ZKEY_PATH)) {
    throw new Error(`zkey file not found: ${ZKEY_PATH}`);
  }

  console.log('⚡ Generating proof...');
  const startTime = Date.now();

  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    WASM_PATH,
    ZKEY_PATH
  );

  const duration = Date.now() - startTime;
  console.log(`✅ Proof generated in ${duration}ms\n`);

  // Parse public signals
  const allTestsPassed = publicSignals[0];
  const passedCount = publicSignals[1];

  console.log('Public Signals:');
  console.log(`  All Tests Passed: ${allTestsPassed}`);
  console.log(`  Passed Count: ${passedCount}/3`);
  console.log(`  Agent Model Hash: ${publicSignals[2]}\n`);

  return {
    proof: {
      pi_a: proof.pi_a.slice(0, 2),
      pi_b: [
        proof.pi_b[0].slice(0, 2),
        proof.pi_b[1].slice(0, 2)
      ],
      pi_c: proof.pi_c.slice(0, 2)
    },
    publicSignals: publicSignals.map(s => s.toString()),
    allTestsPassed: allTestsPassed === '1',
    passedCount: parseInt(passedCount),
    duration
  };
}

/**
 * Verify proof locally
 */
async function verifyProofLocally(proof, publicSignals) {
  const vkeyPath = path.join(__dirname, '../circuits/build/verification_key.json');
  const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

  const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  return isValid;
}

/**
 * Example: Generate proof for test agent
 */
async function testExample() {
  console.log('\n🧪 Testing Agent Behavior Verification\n');

  // Example test scenario
  const testInputs = [
    12345,  // Test input 1
    67890,  // Test input 2
    11111   // Test input 3
  ];

  const expectedOutputs = [
    98765,  // Expected output 1
    43210,  // Expected output 2
    22222   // Expected output 3
  ];

  const actualOutputs = [
    98765,  // Actual output 1 (matches!)
    43210,  // Actual output 2 (matches!)
    22222   // Actual output 3 (matches!)
  ];

  const agentModelHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  const result = await generateBehaviorProof({
    testInputs,
    expectedOutputs,
    actualOutputs,
    agentModelHash
  });

  console.log('\n✅ Test passed!');
  console.log(`All tests passed: ${result.allTestsPassed}`);
  console.log(`Passed count: ${result.passedCount}/3`);

  // Verify locally
  console.log('\n🔍 Verifying proof locally...');
  const isValid = await verifyProofLocally(result.proof, result.publicSignals);
  console.log(`Local verification: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

  return result;
}

// Run test if executed directly
if (require.main === module) {
  testExample()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = {
  generateBehaviorProof,
  verifyProofLocally
};
