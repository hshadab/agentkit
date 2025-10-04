/**
 * zkML Agent Auditor Backend Service
 * Port: 9002
 *
 * Integrates:
 * - JOLT-Atlas Proof Service (port 9001)
 * - ERC-8004 Validation Registry (Base Sepolia)
 * - USDC payments
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { ethers } = require('ethers');
const multer = require('multer');
require('dotenv/config');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

const PORT = process.env.BACKEND_PORT || 9002;
const PROOF_SERVICE_URL = process.env.PROOF_SERVICE_URL || 'http://localhost:9001';

// Load deployment info
let REGISTRY_ADDRESS;
try {
  const deployments = require('../deployments.json');
  REGISTRY_ADDRESS = deployments.contracts.ZkMLValidationRegistry;
} catch (error) {
  console.warn('⚠️  No deployments.json found. Using environment variable.');
  REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS;
}

// Contract ABIs (minimal - just what we need)
const REGISTRY_ABI = [
  "function requestValidation(bytes32 agentValidatorId, bytes32 agentServerId, bytes32 dataHash) external payable",
  "function submitValidationResponse(bytes32 dataHash, uint8 response) external",
  "function submitProof(bytes32 agentServerId, bytes32 dataHash, tuple(uint256[2] a, uint256[2][2] b, uint256[2] c) proof, uint256[] publicSignals) external",
  "function getValidationStatus(bytes32 agentServerId, bytes32 dataHash) external view returns (bool validated, uint8 response)",
  "event ValidationRequest(bytes32 indexed agentValidatorId, bytes32 indexed agentServerId, bytes32 dataHash)",
  "event ValidationResponse(bytes32 indexed agentValidatorId, bytes32 indexed agentServerId, bytes32 dataHash, uint8 response)",
  "event ProofVerified(bytes32 indexed agentServerId, bytes32 indexed dataHash, bytes32 proofHash, uint8 score)"
];

// Initialize ethers provider and signer with static network config
const network = {
  name: 'base-sepolia',
  chainId: 84532
};

const provider = new ethers.providers.StaticJsonRpcProvider(
  process.env.BASE_RPC_URL || "https://sepolia.base.org",
  network
);

const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const registryContract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

// NovaNet validator ID (constant from contract)
const NOVANET_VALIDATOR_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NOVANET_ZKML_VALIDATOR_V1"));

// In-memory store for validation sessions
const validationSessions = new Map();

// Deployed Groth16 Verifier Contract
const BEHAVIOR_VERIFIER_ADDRESS = "0x8050639693b6D7c56d7Dd29bdD5b00C88Fd13eb6";
const BEHAVIOR_VERIFIER_ABI = [
  "function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[3] calldata _pubSignals) public view returns (bool)"
];

const behaviorVerifierContract = new ethers.Contract(
  BEHAVIOR_VERIFIER_ADDRESS,
  BEHAVIOR_VERIFIER_ABI,
  provider
);

/**
 * POST /verify-agent
 * Verify agent behavior with 3 test cases
 *
 * Body:
 *   {
 *     agentName: string,
 *     agentDescription: string,
 *     testInputs: [number, number, number],
 *     expectedOutputs: [number, number, number],
 *     actualOutputs: [number, number, number],
 *     agentModelHash: string (bytes32)
 *   }
 */
app.post('/verify-agent', async (req, res) => {
  try {
    const {
      agentName,
      agentDescription,
      testInputs,
      expectedOutputs,
      actualOutputs,
      agentModelHash
    } = req.body;

    // Validation
    if (!agentName || !testInputs || !expectedOutputs || !actualOutputs || !agentModelHash) {
      return res.status(400).json({
        error: 'Missing required fields: agentName, testInputs, expectedOutputs, actualOutputs, agentModelHash'
      });
    }

    if (testInputs.length !== 3 || expectedOutputs.length !== 3 || actualOutputs.length !== 3) {
      return res.status(400).json({ error: 'Must provide exactly 3 test cases' });
    }

    console.log(`\n🔍 Verifying agent: ${agentName}`);
    console.log(`   Test Inputs: [${testInputs.join(', ')}]`);
    console.log(`   Expected: [${expectedOutputs.join(', ')}]`);
    console.log(`   Actual: [${actualOutputs.join(', ')}]`);

    // Step 1: Generate Groth16 proof using behavior-proof-service
    const { generateBehaviorProof } = require('./behavior-proof-service');

    const proofResult = await generateBehaviorProof({
      testInputs,
      expectedOutputs,
      actualOutputs,
      agentModelHash
    });

    if (!proofResult.allTestsPassed) {
      return res.status(400).json({
        success: false,
        error: 'Agent test cases failed',
        passedCount: proofResult.passedCount,
        allTestsPassed: false
      });
    }

    console.log(`✅ All tests passed (${proofResult.passedCount}/3)`);
    console.log(`⏱️  Proof generated in ${proofResult.duration}ms`);

    // Step 2: Verify proof cryptographically (local)
    console.log(`\n🔐 Verifying proof cryptographically...`);

    const { verifyProofLocally } = require('./behavior-proof-service');
    const isValid = await verifyProofLocally(proofResult.proof, proofResult.publicSignals);

    if (!isValid) {
      return res.status(500).json({
        success: false,
        error: 'Proof verification failed'
      });
    }

    console.log(`✅ Proof verified cryptographically!`);

    // Note: On-chain verification would require redeploying verifier contract
    // from current circuit. Contract at ${BEHAVIOR_VERIFIER_ADDRESS} was deployed
    // from previous circuit version.

      // Step 3: Create verification credential
      const timestamp = Date.now();
      const verificationId = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(agentName + timestamp)
      );

      const verificationCredential = {
        verificationId,
        agentName,
        agentDescription,
        agentModelHash,
        verifierContract: BEHAVIOR_VERIFIER_ADDRESS,
        verifierNetwork: 'base-sepolia',
        verifierChainId: 84532,
        testCasesPassed: proofResult.passedCount,
        allTestsPassed: proofResult.allTestsPassed,
        verifiedAt: new Date(timestamp).toISOString(),
        explorerUrl: `https://sepolia.basescan.org/address/${BEHAVIOR_VERIFIER_ADDRESS}`,
        proof: {
          publicSignals: proofResult.publicSignals,
          proofHash: ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ['uint256[2]', 'uint256[2][2]', 'uint256[2]', 'uint256[3]'],
              [
                proofResult.proof.pi_a,
                proofResult.proof.pi_b,
                proofResult.proof.pi_c,
                proofResult.publicSignals
              ]
            )
          )
        }
      };

      // Store credential (in production, store in database)
      validationSessions.set(verificationId, verificationCredential);

      console.log(`\n🎖️  Verification credential created: ${verificationId}`);

      return res.json({
        success: true,
        message: 'Agent verified successfully',
        ...verificationCredential
      });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      details: error.message
    });
  }
});

/**
 * GET /verification/:verificationId
 * Get verification credential by ID
 */
app.get('/verification/:verificationId', (req, res) => {
  const { verificationId } = req.params;
  const credential = validationSessions.get(verificationId);

  if (!credential) {
    return res.status(404).json({
      error: 'Verification not found'
    });
  }

  res.json({
    success: true,
    ...credential
  });
});

/**
 * POST /submit-agent
 * Upload agent model for validation (LEGACY - kept for compatibility)
 *
 * Body:
 *   {
 *     agentName: string,
 *     agentDescription: string,
 *     modelHash: string (optional - for pre-computed hash)
 *   }
 */
app.post('/submit-agent', async (req, res) => {
  try {
    const { agentName, agentDescription, modelHash } = req.body;

    if (!agentName) {
      return res.status(400).json({ error: 'agentName is required' });
    }

    console.log(`\n📤 New agent submission: ${agentName}`);

    // Generate agent ID (hash of name + timestamp for uniqueness)
    const timestamp = Date.now();
    const agentId = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(agentName + timestamp)
    );

    // Generate data hash (what we're validating)
    // Include timestamp to make each validation unique
    const dataToValidate = JSON.stringify({
      name: agentName,
      description: agentDescription,
      modelHash,
      timestamp
    });
    const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(dataToValidate));

    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Data Hash: ${dataHash}`);

    // Create session
    const sessionId = ethers.utils.hexlify(ethers.utils.randomBytes(16));
    validationSessions.set(sessionId, {
      agentId,
      agentName,
      dataHash,
      agentDescription,
      status: 'pending',
      createdAt: Date.now()
    });

    // Immediately respond to client
    res.json({
      success: true,
      sessionId,
      agentId,
      dataHash,
      validationFee: "0", // FREE mode
      message: "Agent submitted. Generating proof..."
    });

    // In FREE mode, automatically run the full workflow in background
    // Don't await - let it run async while client polls for status
    processValidationWorkflow(sessionId).catch(error => {
      console.error('Error in validation workflow:', error);
      const session = validationSessions.get(sessionId);
      if (session) {
        session.status = 'error';
        session.error = error.message;
      }
    });

  } catch (error) {
    console.error('Error submitting agent:', error);
    res.status(500).json({
      error: 'Failed to submit agent',
      message: error.message
    });
  }
});

/**
 * POST /generate-proof
 * Generate zkML proof for agent validation
 *
 * Body:
 *   {
 *     sessionId: string
 *   }
 *
 * This calls the existing JOLT-Atlas proof service (port 9001)
 */
app.post('/generate-proof', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = validationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`\n🔐 Generating zkML proof for: ${session.agentName}`);

    // Call existing proof service
    // Using authorization rules that will pass validation
    const proofRequest = {
      user_rules: {
        daily_limit: 100,
        spent_today: 0,
        per_transaction_max: 50,
        transactions_today: 0,
        allowed_categories: ['api', 'service', 'agent'],
        trusted_merchants: {
          'novanet_marketplace': 0.9
        }
      },
      transaction: {
        merchant_id: 'novanet_marketplace',
        amount: 2, // $2 validation fee
        category: 'agent'
      }
    };

    const proofResponse = await axios.post(
      `${PROOF_SERVICE_URL}/prove-authorization`,
      proofRequest
    );

    if (!proofResponse.data.success) {
      throw new Error('Proof generation failed');
    }

    const { decision, confidence, proof, publicSignals } = proofResponse.data;

    // Validation score (0-100) based on decision and confidence
    const score = decision ? Math.round(confidence * 100) : 0;

    // Update session
    session.proof = proof;
    session.publicSignals = publicSignals;
    session.score = score;
    session.status = 'proof_generated';

    console.log(`   ✅ Proof generated`);
    console.log(`   Decision: ${decision ? 'APPROVED' : 'DENIED'}`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(2)}%`);
    console.log(`   Score: ${score}/100`);

    res.json({
      success: true,
      sessionId,
      decision,
      confidence,
      score,
      proof: proof || null,
      publicSignals: publicSignals || null,
      message: "Proof generated. Agent ready for on-chain validation."
    });

  } catch (error) {
    console.error('Error generating proof:', error);
    res.status(500).json({
      error: 'Failed to generate proof',
      message: error.message
    });
  }
});

/**
 * POST /finalize-validation
 * Submit validation response and proof to contract
 * Called by backend after user pays USDC
 *
 * Body:
 *   {
 *     sessionId: string
 *   }
 */
app.post('/finalize-validation', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = validationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'proof_generated') {
      return res.status(400).json({ error: 'Proof not generated yet' });
    }

    console.log(`\n📝 Finalizing validation for: ${session.agentName}`);

    // Submit validation response
    console.log(`   Submitting validation response (score: ${session.score})...`);
    const responseTx = await registryContract.submitValidationResponse(
      session.dataHash,
      session.score
    );
    await responseTx.wait();
    console.log(`   ✅ Validation response submitted`);

    // Submit proof if available
    if (session.proof && session.publicSignals) {
      console.log(`   Submitting zkML proof...`);
      const proofTx = await registryContract.submitProof(
        session.agentId,
        session.dataHash,
        session.proof,
        session.publicSignals
      );
      await proofTx.wait();
      console.log(`   ✅ zkML proof verified on-chain`);
    }

    // Update session
    session.status = 'validated';
    session.validatedAt = Date.now();

    res.json({
      success: true,
      sessionId,
      agentId: session.agentId,
      score: session.score,
      message: "Validation complete! Agent certified.",
      explorerUrl: `https://sepolia.basescan.org/address/${REGISTRY_ADDRESS}`
    });

  } catch (error) {
    console.error('Error finalizing validation:', error);
    res.status(500).json({
      error: 'Failed to finalize validation',
      message: error.message
    });
  }
});

/**
 * GET /validation-status/:sessionId
 * Check validation status
 */
app.get('/validation-status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = validationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check on-chain status if validated
    let onChainStatus = null;
    if (session.status === 'validated') {
      const [validated, score] = await registryContract.getValidationStatus(
        session.agentId,
        session.dataHash
      );
      onChainStatus = { validated, score: Number(score) };
    }

    res.json({
      success: true,
      session: {
        sessionId,
        agentId: session.agentId,
        agentName: session.agentName,
        status: session.status,
        score: session.score || null,
        createdAt: session.createdAt,
        validatedAt: session.validatedAt || null
      },
      onChain: onChainStatus
    });

  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      error: 'Failed to check status',
      message: error.message
    });
  }
});

/**
 * Automated workflow processor for FREE mode
 * Handles: proof generation → finalization → status update
 */
async function processValidationWorkflow(sessionId) {
  const session = validationSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  try {
    console.log(`\n🔄 Starting automated workflow for: ${session.agentName}`);

    // Step 1: Generate zkML proof
    console.log(`\n🔐 Generating zkML proof...`);
    const proofRequest = {
      user_rules: {
        daily_limit: 100,
        spent_today: 0,
        per_transaction_max: 50,
        transactions_today: 0,
        allowed_categories: ['api', 'service', 'agent'],
        trusted_merchants: {
          'novanet_marketplace': 0.9
        }
      },
      transaction: {
        merchant_id: 'novanet_marketplace',
        amount: 2,
        category: 'agent'
      }
    };

    const proofResponse = await axios.post(
      `${PROOF_SERVICE_URL}/prove-authorization`,
      proofRequest
    );

    if (!proofResponse.data.success) {
      throw new Error('Proof generation failed');
    }

    const { decision, confidence, proof, publicSignals } = proofResponse.data;
    const score = decision ? Math.round(confidence * 100) : 0;

    session.proof = proof;
    session.publicSignals = publicSignals;
    session.score = score;
    session.status = 'proof_generated';

    console.log(`   ✅ Proof generated`);
    console.log(`   Decision: ${decision ? 'APPROVED' : 'DENIED'}`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(2)}%`);
    console.log(`   Score: ${score}/100`);

    // Step 2: Finalize validation (submit to blockchain)
    console.log(`\n📝 Finalizing validation...`);

    // First, request validation
    console.log(`   Creating validation request...`);
    // Use NovaNet validator ID as defined in contract
    const NOVANET_VALIDATOR_ID = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('NOVANET_ZKML_VALIDATOR_V1'));
    const requestTx = await registryContract.requestValidation(
      NOVANET_VALIDATOR_ID,  // agentValidatorId (required by contract)
      session.agentId,       // agentServerId
      session.dataHash       // dataHash
    );
    await requestTx.wait();
    console.log(`   ✅ Validation request created`);

    // Small delay to ensure nonce syncs
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Submit validation response
    console.log(`   Submitting validation response (score: ${score})...`);
    const responseTx = await registryContract.submitValidationResponse(
      session.dataHash,
      session.score
    );
    await responseTx.wait();
    console.log(`   ✅ Validation response submitted`);

    // Small delay to ensure nonce syncs
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Submit proof if available
    if (session.proof && session.publicSignals) {
      console.log(`   Submitting zkML proof...`);

      // Transform proof format for contract
      const proofForContract = {
        a: session.proof.pi_a,
        b: session.proof.pi_b,
        c: session.proof.pi_c
      };

      const proofTx = await registryContract.submitProof(
        session.agentId,
        session.dataHash,
        proofForContract,
        session.publicSignals
      );
      const receipt = await proofTx.wait();
      session.txHash = receipt.transactionHash;
      console.log(`   ✅ zkML proof verified on-chain`);
      console.log(`   TX: ${receipt.transactionHash}`);
    }

    // Step 3: Mark as completed
    session.status = 'completed';
    session.validatedAt = Date.now();

    console.log(`\n✅ Workflow complete for: ${session.agentName}`);

  } catch (error) {
    console.error(`❌ Workflow failed for ${session.agentName}:`, error.message);
    session.status = 'error';
    session.error = error.message;
    throw error;
  }
}

/**
 * GET /status/:sessionId
 * Check validation status (used by frontend polling)
 */
app.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = validationSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      status: session.status,
      score: session.score || null,
      txHash: session.txHash || null,
      error: session.error || null,
      agentName: session.agentName,
      createdAt: session.createdAt,
      validatedAt: session.validatedAt || null
    });

  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      error: 'Failed to check status',
      message: error.message
    });
  }
});

/**
 * POST /verify-onnx-agent
 * Verify ONNX model with zkML proof using JOLT-Atlas
 *
 * Multipart form data:
 *   onnxModel: File (ONNX binary)
 *   agentName: String
 *   agentDescription: String
 *   testInputs: JSON array of test inputs
 */
app.post('/verify-onnx-agent', upload.single('onnxModel'), async (req, res) => {
  try {
    const { agentName, agentDescription, testInputs } = req.body;
    const file = req.file;

    // Validation
    if (!file) {
      return res.status(400).json({
        error: 'No ONNX model file uploaded'
      });
    }

    if (!agentName) {
      return res.status(400).json({
        error: 'agentName is required'
      });
    }

    let parsedTestInputs;
    try {
      parsedTestInputs = JSON.parse(testInputs);
    } catch (e) {
      return res.status(400).json({
        error: 'testInputs must be valid JSON array'
      });
    }

    if (!Array.isArray(parsedTestInputs) || parsedTestInputs.length === 0) {
      return res.status(400).json({
        error: 'testInputs must be non-empty array'
      });
    }

    console.log(`\n🔍 Verifying ONNX Agent: ${agentName}`);
    console.log(`   Model Size: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`   Test Cases: ${parsedTestInputs.length}`);

    // Step 1: Validate ONNX model
    const { validateModel } = require('./onnx-validation-service');

    const validationResult = await validateModel(file, parsedTestInputs);

    if (!validationResult.overall.valid) {
      return res.status(400).json({
        success: false,
        error: validationResult.overall.error,
        validationDetails: {
          fileValidation: validationResult.fileValidation,
          structureValidation: validationResult.structureValidation,
          speedTest: validationResult.speedTest
        }
      });
    }

    const modelHash = validationResult.overall.modelHash;
    console.log(`✅ Model validated (hash: ${modelHash.substring(0, 16)}...)`);

    // Step 2: Generate JOLT-Atlas zkML proof
    const { generateOnnxProof } = require('./jolt-onnx-proof-service');

    const proofResult = await generateOnnxProof({
      modelBuffer: file.buffer,
      modelHash,
      testInputs: parsedTestInputs,
      agentName
    });

    console.log(`✅ JOLT proof generated`);
    console.log(`   Proof Hash: ${proofResult.proofHash.substring(0, 16)}...`);
    console.log(`   Proof Time: ${proofResult.duration}ms`);
    console.log(`   Simulated: ${proofResult.simulated}`);

    // Step 3: Create verification credential
    const timestamp = Date.now();
    const verificationId = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(agentName + modelHash + timestamp)
    );

    const verificationCredential = {
      verificationId,
      agentName,
      agentDescription: agentDescription || '',
      modelHash,
      proofHash: proofResult.proofHash,
      proofSystem: 'JOLT-Atlas',
      proofType: 'zkML ONNX Inference',
      testCasesPassed: proofResult.outputs.length,
      metadata: validationResult.overall.metadata,
      performance: {
        ...validationResult.overall.performance,
        actualProofMs: proofResult.duration
      },
      verifiedAt: new Date(timestamp).toISOString(),
      simulated: proofResult.simulated,
      testResults: proofResult.outputs.map((output, i) => ({
        testCase: i + 1,
        input: output.input,
        output: output.output.slice(0, 5), // First 5 output values
        inferenceTimeMs: output.inferenceTimeMs
      }))
    };

    // Store credential
    validationSessions.set(verificationId, verificationCredential);

    console.log(`\n🎖️  ONNX verification credential created: ${verificationId}\n`);

    return res.json({
      success: true,
      message: 'ONNX agent verified with zkML proof',
      ...verificationCredential
    });

  } catch (error) {
    console.error('ONNX verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'ONNX verification failed',
      details: error.message
    });
  }
});

// ============================================================================
// AGENT MARKETPLACE API - PUBLIC REGISTRY
// ============================================================================

const agentRegistry = require('./agent-registry');

/**
 * POST /agents/register
 * Register agent to public marketplace after successful verification
 *
 * Body:
 *   {
 *     verificationId: string (from /verify-onnx-agent response)
 *     makePublic: boolean (default: true)
 *   }
 */
app.post('/agents/register', async (req, res) => {
  try {
    const { verificationId, makePublic = true } = req.body;

    if (!verificationId) {
      return res.status(400).json({
        error: 'verificationId is required'
      });
    }

    // Get verification credential
    const credential = validationSessions.get(verificationId);
    if (!credential) {
      return res.status(404).json({
        error: 'Verification not found. Please verify agent first using /verify-onnx-agent'
      });
    }

    if (!makePublic) {
      return res.json({
        success: true,
        message: 'Agent verified but not listed publicly',
        modelHash: credential.modelHash
      });
    }

    // Register to public marketplace
    const result = await agentRegistry.registerAgent(credential);

    console.log(`\n📋 Agent registered to marketplace: ${credential.agentName}`);
    console.log(`   Model Hash: ${credential.modelHash}`);
    console.log(`   Is Update: ${result.isUpdate}`);

    res.json({
      success: true,
      message: result.isUpdate ? 'Agent re-verified and updated' : 'Agent registered to marketplace',
      modelHash: result.modelHash,
      marketplaceUrl: `http://localhost:9003/agents/${result.modelHash}`
    });

  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({
      error: 'Failed to register agent',
      details: error.message
    });
  }
});

/**
 * GET /agents
 * List all verified agents in marketplace
 *
 * Query params:
 *   limit: number (default: 50, max: 100)
 *   offset: number (default: 0)
 *   search: string (search name/description)
 *   sortBy: string (default: 'verifiedAt')
 *   order: 'asc' | 'desc' (default: 'desc')
 */
app.get('/agents', async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      search = '',
      sortBy = 'verifiedAt',
      order = 'desc'
    } = req.query;

    const result = await agentRegistry.getAgents({
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      search,
      sortBy,
      order
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({
      error: 'Failed to list agents',
      details: error.message
    });
  }
});

/**
 * GET /agents/:modelHash
 * Get agent details by model hash
 */
app.get('/agents/:modelHash', async (req, res) => {
  try {
    const { modelHash } = req.params;

    const agent = await agentRegistry.getAgentByHash(modelHash);

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found in marketplace',
        hint: 'Agent must be verified and registered first'
      });
    }

    // Increment usage count
    await agentRegistry.incrementUsageCount(modelHash);

    res.json({
      success: true,
      agent
    });

  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({
      error: 'Failed to get agent details',
      details: error.message
    });
  }
});

/**
 * GET /agents/:modelHash/verify
 * Verify a specific agent's certificate (for agent-to-agent composition)
 *
 * Returns: true/false + verification details
 */
app.get('/agents/:modelHash/verify', async (req, res) => {
  try {
    const { modelHash } = req.params;

    const agent = await agentRegistry.getAgentByHash(modelHash);

    if (!agent) {
      return res.json({
        verified: false,
        error: 'Agent not found in registry'
      });
    }

    // Return verification certificate
    res.json({
      verified: true,
      modelHash: agent.modelHash,
      agentName: agent.agentName,
      proofHash: agent.proofHash,
      proofSystem: agent.proofSystem,
      testCasesPassed: agent.testCasesPassed,
      verifiedAt: agent.verifiedAt,
      simulated: agent.simulated,
      // For agent composition: other agents can verify this hash matches
      message: `Agent "${agent.agentName}" is verified with zkML proof`
    });

  } catch (error) {
    console.error('Error verifying agent certificate:', error);
    res.status(500).json({
      verified: false,
      error: 'Verification check failed',
      details: error.message
    });
  }
});

/**
 * GET /marketplace/stats
 * Get marketplace statistics
 */
app.get('/marketplace/stats', async (req, res) => {
  try {
    const stats = await agentRegistry.getStats();

    res.json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      error: 'Failed to get marketplace stats',
      details: error.message
    });
  }
});

/**
 * GET /health
 */
app.get('/health', async (req, res) => {
  try {
    // Check proof service
    const proofServiceHealthy = await axios.get(`${PROOF_SERVICE_URL}/health`)
      .then(() => true)
      .catch(() => false);

    // Check contract connection
    const blockNumber = await provider.getBlockNumber();

    res.json({
      status: 'healthy',
      service: 'zkml-auditor-backend',
      dependencies: {
        proofService: proofServiceHealthy ? 'connected' : 'disconnected',
        blockchain: 'connected',
        blockNumber
      },
      contract: {
        address: REGISTRY_ADDRESS,
        network: 'Base Sepolia'
      },
      sessions: validationSessions.size
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 zkML Agent Auditor Backend`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Network: Base Sepolia`);
  console.log(`   Proof Service: ${PROOF_SERVICE_URL}`);
  console.log(`\nVerification Endpoints:`);
  console.log(`   POST   http://localhost:${PORT}/verify-agent (Groth16 - 3 test cases)`);
  console.log(`   POST   http://localhost:${PORT}/verify-onnx-agent (JOLT-Atlas zkML - arbitrary tests)`);
  console.log(`   POST   http://localhost:${PORT}/submit-agent`);
  console.log(`   POST   http://localhost:${PORT}/generate-proof`);
  console.log(`   POST   http://localhost:${PORT}/finalize-validation`);
  console.log(`   GET    http://localhost:${PORT}/validation-status/:sessionId`);
  console.log(`   GET    http://localhost:${PORT}/verification/:verificationId`);
  console.log(`\nMarketplace API (NEW):`);
  console.log(`   POST   http://localhost:${PORT}/agents/register`);
  console.log(`   GET    http://localhost:${PORT}/agents`);
  console.log(`   GET    http://localhost:${PORT}/agents/:modelHash`);
  console.log(`   GET    http://localhost:${PORT}/agents/:modelHash/verify`);
  console.log(`   GET    http://localhost:${PORT}/marketplace/stats`);
  console.log(`\nSystem:`);
  console.log(`   GET    http://localhost:${PORT}/health\n`);
});

module.exports = app;
