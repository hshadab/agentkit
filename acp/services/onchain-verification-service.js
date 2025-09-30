/**
 * On-Chain Verification Service
 * Verifies Groth16 proofs on Base Sepolia blockchain
 * Port: 9004
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.ONCHAIN_VERIFICATION_PORT || 9004;

// Load deployment info
const DEPLOYMENT_PATH = path.join(__dirname, '../contracts/deployments.json');
let VERIFIER_ADDRESS = process.env.BASE_VERIFIER_ADDRESS;
let provider, verifierContract;

// Minimal Groth16 Verifier ABI (only verifyProof function)
const VERIFIER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "_pA", "type": "uint256[2]" },
      { "internalType": "uint256[2][2]", "name": "_pB", "type": "uint256[2][2]" },
      { "internalType": "uint256[2]", "name": "_pC", "type": "uint256[2]" },
      { "internalType": "uint256[]", "name": "_pubSignals", "type": "uint256[]" }
    ],
    "name": "verifyProof",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// In-memory cache of verified proofs
const verificationHistory = [];

/**
 * Initialize connection to Base Sepolia
 */
async function initializeBlockchain() {
  try {
    // Load deployment info if address not in env
    if (!VERIFIER_ADDRESS && fs.existsSync(DEPLOYMENT_PATH)) {
      const deployments = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, 'utf8'));
      if (deployments['base-sepolia']) {
        VERIFIER_ADDRESS = deployments['base-sepolia'].address;
        console.log(`📄 Loaded verifier address from deployments: ${VERIFIER_ADDRESS}`);
      }
    }

    if (!VERIFIER_ADDRESS || VERIFIER_ADDRESS === '0x...') {
      console.warn('⚠️  No verifier address configured');
      console.log('   Deploy contract first: node contracts/deploy-verifier.js');
      return false;
    }

    // Connect to Base Sepolia
    const RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
    provider = new ethers.JsonRpcProvider(RPC_URL, {
      chainId: 84532,
      name: 'base-sepolia'
    });

    // Create contract instance
    verifierContract = new ethers.Contract(
      VERIFIER_ADDRESS,
      VERIFIER_ABI,
      provider
    );

    // Test connection
    const network = await provider.getNetwork();
    console.log(`✅ Connected to Base Sepolia (chainId: ${network.chainId})`);
    console.log(`📜 Verifier contract: ${VERIFIER_ADDRESS}`);
    console.log(`🔗 Explorer: https://sepolia.basescan.org/address/${VERIFIER_ADDRESS}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize blockchain:', error.message);
    return false;
  }
}

/**
 * Format proof for contract verification
 */
function formatProofForContract(proof, publicSignals) {
  return {
    pA: [proof.pi_a[0], proof.pi_a[1]],
    pB: [
      [proof.pi_b[0][1], proof.pi_b[0][0]], // Reverse for contract
      [proof.pi_b[1][1], proof.pi_b[1][0]]
    ],
    pC: [proof.pi_c[0], proof.pi_c[1]],
    pubSignals: publicSignals.map(s => BigInt(s).toString())
  };
}

/**
 * POST /verify-onchain
 * Verify Groth16 proof on Base Sepolia blockchain
 */
app.post('/verify-onchain', async (req, res) => {
  try {
    if (!verifierContract) {
      return res.status(503).json({
        error: 'On-chain verification not available',
        reason: 'Verifier contract not deployed or configured'
      });
    }

    const { proof, publicSignals } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({
        error: 'Missing required fields: proof, publicSignals'
      });
    }

    console.log(`🔍 Verifying proof on-chain...`);
    const startTime = Date.now();

    // Format proof for contract
    const formattedProof = formatProofForContract(proof, publicSignals);

    // Call verifyProof on-chain (view function, no gas cost)
    const isValid = await verifierContract.verifyProof(
      formattedProof.pA,
      formattedProof.pB,
      formattedProof.pC,
      formattedProof.pubSignals
    );

    const verificationTime = Date.now() - startTime;

    // Record verification
    const record = {
      timestamp: Date.now(),
      valid: isValid,
      publicSignals,
      verificationTime,
      verifierAddress: VERIFIER_ADDRESS,
      explorer: `https://sepolia.basescan.org/address/${VERIFIER_ADDRESS}`
    };

    verificationHistory.push(record);

    // Keep only last 1000 verifications
    if (verificationHistory.length > 1000) {
      verificationHistory.shift();
    }

    res.json({
      success: true,
      valid: isValid,
      verification_time_ms: verificationTime,
      verifier_address: VERIFIER_ADDRESS,
      network: 'base-sepolia',
      chain_id: 84532,
      explorer: `https://sepolia.basescan.org/address/${VERIFIER_ADDRESS}`,
      timestamp: Date.now()
    });

    console.log(`${isValid ? '✅' : '❌'} On-chain verification: ${isValid ? 'VALID' : 'INVALID'} (${verificationTime}ms)`);

  } catch (error) {
    console.error('On-chain verification error:', error);
    res.status(500).json({
      error: 'On-chain verification failed',
      message: error.message,
      code: error.code
    });
  }
});

/**
 * POST /verify-and-store
 * Verify proof and store verification on-chain (requires gas)
 */
app.post('/verify-and-store', async (req, res) => {
  try {
    if (!verifierContract) {
      return res.status(503).json({
        error: 'On-chain verification not available'
      });
    }

    const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!PRIVATE_KEY || PRIVATE_KEY === '0x...') {
      return res.status(500).json({
        error: 'Private key not configured',
        message: 'Set BASE_PRIVATE_KEY in .env to use state-changing transactions'
      });
    }

    const { proof, publicSignals, metadata } = req.body;

    console.log(`💾 Verifying and storing proof on-chain...`);
    const startTime = Date.now();

    // Create wallet signer
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Format proof
    const formattedProof = formatProofForContract(proof, publicSignals);

    // First verify off-chain
    const isValid = await verifierContract.verifyProof(
      formattedProof.pA,
      formattedProof.pB,
      formattedProof.pC,
      formattedProof.pubSignals
    );

    if (!isValid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Proof verification failed, will not store on-chain'
      });
    }

    // TODO: Call storage contract to save verification
    // For now, just return success with verification result
    // In production, you'd deploy a separate storage contract that:
    // 1. Calls verifier contract
    // 2. If valid, stores verification with metadata
    // 3. Emits event for indexing

    const verificationTime = Date.now() - startTime;

    res.json({
      success: true,
      valid: true,
      verification_time_ms: verificationTime,
      verifier_address: VERIFIER_ADDRESS,
      network: 'base-sepolia',
      chain_id: 84532,
      note: 'Proof verified on-chain. Storage contract not yet deployed.',
      todo: 'Deploy ProofStorage contract for permanent on-chain records'
    });

    console.log(`✅ Proof verified on-chain (${verificationTime}ms)`);

  } catch (error) {
    console.error('Verify-and-store error:', error);
    res.status(500).json({
      error: 'Failed to verify and store',
      message: error.message
    });
  }
});

/**
 * GET /history
 * Get on-chain verification history
 */
app.get('/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  const history = verificationHistory
    .slice(-limit - offset, verificationHistory.length - offset)
    .reverse();

  res.json({
    success: true,
    total: verificationHistory.length,
    limit,
    offset,
    history
  });
});

/**
 * GET /stats
 * Get verification statistics
 */
app.get('/stats', (req, res) => {
  const stats = {
    total_verifications: verificationHistory.length,
    valid_count: verificationHistory.filter(v => v.valid).length,
    invalid_count: verificationHistory.filter(v => !v.valid).length,
    success_rate: verificationHistory.length > 0
      ? (verificationHistory.filter(v => v.valid).length / verificationHistory.length * 100).toFixed(2) + '%'
      : '0%',
    avg_verification_time_ms: verificationHistory.length > 0
      ? (verificationHistory.reduce((sum, v) => sum + v.verificationTime, 0) / verificationHistory.length).toFixed(2)
      : 0,
    verifier_address: VERIFIER_ADDRESS,
    network: 'base-sepolia',
    explorer: VERIFIER_ADDRESS ? `https://sepolia.basescan.org/address/${VERIFIER_ADDRESS}` : null
  };

  res.json({
    success: true,
    stats
  });
});

/**
 * GET /health
 */
app.get('/health', async (req, res) => {
  let blockNumber = null;
  let contractExists = false;

  if (provider) {
    try {
      blockNumber = await provider.getBlockNumber();
      if (VERIFIER_ADDRESS) {
        const code = await provider.getCode(VERIFIER_ADDRESS);
        contractExists = code !== '0x';
      }
    } catch (error) {
      // Ignore
    }
  }

  res.json({
    status: verifierContract ? 'healthy' : 'degraded',
    service: 'onchain-verification-service',
    network: 'base-sepolia',
    chain_id: 84532,
    verifier_address: VERIFIER_ADDRESS || null,
    contract_deployed: contractExists,
    current_block: blockNumber,
    total_verifications: verificationHistory.length,
    uptime: process.uptime()
  });
});

// Initialize and start server
initializeBlockchain().then(success => {
  app.listen(PORT, () => {
    console.log(`\n🔐 On-Chain Verification Service running on port ${PORT}`);
    console.log(`🌐 Network: Base Sepolia (chainId: 84532)`);
    if (success) {
      console.log(`📜 Verifier: ${VERIFIER_ADDRESS}`);
    } else {
      console.log(`⚠️  Verifier not configured (view-only mode)`);
    }
    console.log(`\nEndpoints:`);
    console.log(`  POST http://localhost:${PORT}/verify-onchain`);
    console.log(`  POST http://localhost:${PORT}/verify-and-store`);
    console.log(`  GET  http://localhost:${PORT}/history`);
    console.log(`  GET  http://localhost:${PORT}/stats`);
    console.log(`  GET  http://localhost:${PORT}/health\n`);
  });
});

module.exports = app;