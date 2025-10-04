/**
 * Test ONNX Verification Endpoint
 * Tests the POST /verify-onnx-agent endpoint with existing authorization model
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:9002';
const ONNX_MODEL_PATH = path.join(__dirname, '../acp/models/authorization_model.onnx');

async function testOnnxVerification() {
  console.log('\n🧪 Testing ONNX Verification Endpoint');
  console.log('=====================================\n');

  // Check if model exists
  if (!fs.existsSync(ONNX_MODEL_PATH)) {
    console.error(`❌ Model not found: ${ONNX_MODEL_PATH}`);
    return;
  }

  console.log(`📁 Model: ${ONNX_MODEL_PATH}`);
  console.log(`📊 Model Size: ${(fs.statSync(ONNX_MODEL_PATH).size / 1024).toFixed(2)} KB\n`);

  // Prepare test data
  const agentName = 'FraudDetectionAgent';
  const agentDescription = 'AI agent for fraud detection using neural network authorization model';

  // Test inputs for authorization model
  // Inputs: [budget_remaining, merchant_trust, amount, category_score, velocity]
  const testInputs = [
    [95.43, 0.9, 1.5, 0.8, 0.1],    // Test 1: Safe transaction
    [50.0, 0.5, 25.0, 0.6, 0.5],     // Test 2: Medium risk
    [10.0, 0.1, 8.0, 0.2, 0.9]       // Test 3: High risk
  ];

  console.log('Test Inputs:');
  testInputs.forEach((input, i) => {
    console.log(`  Test ${i+1}: Budget=$${input[0]}, Trust=${input[1]}, Amount=$${input[2]}, Category=${input[3]}, Velocity=${input[4]}`);
  });
  console.log();

  // Create form data
  const formData = new FormData();
  formData.append('onnxModel', fs.createReadStream(ONNX_MODEL_PATH), {
    filename: 'authorization_model.onnx',
    contentType: 'application/octet-stream'
  });
  formData.append('agentName', agentName);
  formData.append('agentDescription', agentDescription);
  formData.append('testInputs', JSON.stringify(testInputs));

  try {
    console.log('🚀 Sending request to /verify-onnx-agent...\n');

    const response = await axios.post(
      `${BACKEND_URL}/verify-onnx-agent`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    if (response.data.success) {
      console.log('✅ Verification Successful!\n');
      console.log('Verification Results:');
      console.log('====================');
      console.log(`Agent Name: ${response.data.agentName}`);
      console.log(`Verification ID: ${response.data.verificationId}`);
      console.log(`Model Hash: ${response.data.modelHash.substring(0, 32)}...`);
      console.log(`Proof Hash: ${response.data.proofHash.substring(0, 32)}...`);
      console.log(`Proof System: ${response.data.proofSystem}`);
      console.log(`Proof Type: ${response.data.proofType}`);
      console.log(`Test Cases Passed: ${response.data.testCasesPassed}`);
      console.log(`Simulated: ${response.data.simulated}`);
      console.log(`Verified At: ${response.data.verifiedAt}\n`);

      console.log('Model Metadata:');
      console.log('===============');
      console.log(`Inputs: ${response.data.metadata.inputs.join(', ')}`);
      console.log(`Outputs: ${response.data.metadata.outputs.join(', ')}`);
      console.log(`Model Size: ${response.data.metadata.modelSizeMB} MB`);
      console.log(`Estimated Parameters: ${response.data.metadata.estimatedParams}\n`);

      console.log('Performance:');
      console.log('============');
      console.log(`Local Inference: ${response.data.performance.localInferenceMs}ms`);
      console.log(`Estimated Proof Time: ${response.data.performance.estimatedProofSec}s`);
      console.log(`Actual Proof Time: ${response.data.performance.actualProofMs}ms\n`);

      console.log('Test Results:');
      console.log('=============');
      response.data.testResults.forEach((result, i) => {
        console.log(`Test ${result.testCase}:`);
        console.log(`  Input: [${result.input.join(', ')}]`);
        console.log(`  Output: [${result.output.map(v => v.toFixed(4)).join(', ')}]`);
        console.log(`  Inference Time: ${result.inferenceTimeMs}ms`);
      });
      console.log();

      // Verification badge
      console.log('🎖️  Verification Badge:');
      console.log('======================');
      console.log(`✅ zkML Verified Agent`);
      console.log(`Name: ${response.data.agentName}`);
      console.log(`Model Hash: ${response.data.modelHash}`);
      console.log(`Size: ${response.data.metadata.modelSizeMB} MB`);
      console.log(`Tests Passed: ${response.data.testCasesPassed}/${response.data.testCasesPassed}`);
      console.log(`Verified: ${new Date(response.data.verifiedAt).toLocaleDateString()}`);
      console.log(`Proof System: ${response.data.proofSystem}`);
      console.log();

    } else {
      console.error('❌ Verification Failed');
      console.error('Error:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Test Failed');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data.error);
      if (error.response.data.details) {
        console.error('Details:', error.response.data.details);
      }
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run test
testOnnxVerification()
  .then(() => {
    console.log('\n✅ Test completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
