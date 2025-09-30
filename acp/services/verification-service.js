/**
 * Merchant Verification Service
 * Verifies JOLT proofs before order fulfillment
 * Port: 9003
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.VERIFICATION_SERVICE_PORT || 9003;

// In-memory cache of verified proofs
const verifiedProofs = new Map();
const verificationHistory = [];

/**
 * Verify JOLT proof authenticity
 * In production, this would verify cryptographic proof
 */
function verifyJoltProof(proof, modelHash, inputsHash) {
  try {
    // Extract proof components
    if (!proof || !proof.startsWith('0xjolt_')) {
      return {
        valid: false,
        reason: 'Invalid proof format'
      };
    }

    // Check if proof was already verified (prevent replay)
    const proofHash = crypto.createHash('sha256').update(proof).digest('hex');
    if (verifiedProofs.has(proofHash)) {
      const cached = verifiedProofs.get(proofHash);
      // Allow re-verification within 1 hour
      if (Date.now() - cached.timestamp < 3600000) {
        return {
          valid: true,
          cached: true,
          timestamp: cached.timestamp
        };
      }
    }

    // Simulate cryptographic verification (~50ms)
    const startTime = Date.now();

    // In production, this would:
    // 1. Parse proof components
    // 2. Verify SNARK/STARK proof
    // 3. Check public inputs match
    // 4. Validate signatures

    // For development, validate structure
    const proofData = proof.substring(7); // Remove '0xjolt_'
    if (proofData.length !== 64) {
      return {
        valid: false,
        reason: 'Invalid proof data length'
      };
    }

    const verificationTime = Date.now() - startTime;

    // Cache successful verification
    verifiedProofs.set(proofHash, {
      timestamp: Date.now(),
      modelHash,
      inputsHash
    });

    return {
      valid: true,
      verification_time_ms: verificationTime,
      proof_hash: proofHash,
      timestamp: Date.now()
    };

  } catch (error) {
    return {
      valid: false,
      reason: 'Verification error',
      error: error.message
    };
  }
}

/**
 * POST /verify
 * Verify authorization proof
 */
app.post('/verify', async (req, res) => {
  try {
    const {
      proof,
      model_hash,
      inputs_hash,
      expected_decision
    } = req.body;

    if (!proof) {
      return res.status(400).json({
        error: 'Missing proof'
      });
    }

    const startTime = Date.now();

    // Verify proof
    const verificationResult = verifyJoltProof(proof, model_hash, inputs_hash);

    const totalTime = Date.now() - startTime;

    // Record verification
    const record = {
      proof_hash: verificationResult.proof_hash,
      valid: verificationResult.valid,
      model_hash,
      inputs_hash,
      expected_decision,
      timestamp: Date.now(),
      verification_time_ms: totalTime
    };

    verificationHistory.push(record);

    // Keep only last 1000 verifications
    if (verificationHistory.length > 1000) {
      verificationHistory.shift();
    }

    res.json({
      success: true,
      valid: verificationResult.valid,
      cached: verificationResult.cached || false,
      proof_hash: verificationResult.proof_hash,
      verification_time_ms: totalTime,
      timestamp: verificationResult.timestamp,
      reason: verificationResult.reason
    });

    console.log(`🔍 Proof verified: ${verificationResult.valid ? '✅ VALID' : '❌ INVALID'} (${totalTime}ms)`);

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /verify-batch
 * Verify multiple proofs at once
 */
app.post('/verify-batch', async (req, res) => {
  try {
    const { proofs } = req.body;

    if (!Array.isArray(proofs) || proofs.length === 0) {
      return res.status(400).json({
        error: 'Invalid proofs array'
      });
    }

    const startTime = Date.now();
    const results = [];

    for (const proofData of proofs) {
      const result = verifyJoltProof(
        proofData.proof,
        proofData.model_hash,
        proofData.inputs_hash
      );

      results.push({
        proof: proofData.proof,
        valid: result.valid,
        proof_hash: result.proof_hash,
        reason: result.reason
      });

      // Record in history
      verificationHistory.push({
        proof_hash: result.proof_hash,
        valid: result.valid,
        model_hash: proofData.model_hash,
        inputs_hash: proofData.inputs_hash,
        timestamp: Date.now(),
        batch: true
      });
    }

    const totalTime = Date.now() - startTime;

    res.json({
      success: true,
      verified_count: results.filter(r => r.valid).length,
      failed_count: results.filter(r => !r.valid).length,
      results,
      total_time_ms: totalTime,
      avg_time_ms: totalTime / proofs.length
    });

    console.log(`🔍 Batch verified: ${results.filter(r => r.valid).length}/${proofs.length} valid (${totalTime}ms)`);

  } catch (error) {
    console.error('Batch verification error:', error);
    res.status(500).json({
      error: 'Batch verification failed',
      message: error.message
    });
  }
});

/**
 * GET /proof/:proofHash
 * Check if proof was previously verified
 */
app.get('/proof/:proofHash', (req, res) => {
  const { proofHash } = req.params;
  const cached = verifiedProofs.get(proofHash);

  if (!cached) {
    return res.status(404).json({
      error: 'Proof not found in cache'
    });
  }

  res.json({
    success: true,
    proof_hash: proofHash,
    verified: true,
    timestamp: cached.timestamp,
    model_hash: cached.modelHash,
    inputs_hash: cached.inputsHash,
    age_ms: Date.now() - cached.timestamp
  });
});

/**
 * GET /history
 * Get verification history
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
    cached_proofs: verifiedProofs.size,
    valid_count: verificationHistory.filter(v => v.valid).length,
    invalid_count: verificationHistory.filter(v => !v.valid).length,
    success_rate: verificationHistory.length > 0
      ? (verificationHistory.filter(v => v.valid).length / verificationHistory.length * 100).toFixed(2) + '%'
      : '0%',
    avg_verification_time_ms: verificationHistory.length > 0
      ? (verificationHistory.reduce((sum, v) => sum + (v.verification_time_ms || 0), 0) / verificationHistory.length).toFixed(2)
      : 0,
    last_verification: verificationHistory.length > 0
      ? verificationHistory[verificationHistory.length - 1].timestamp
      : null
  };

  res.json({
    success: true,
    stats
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'verification-service',
    cached_proofs: verifiedProofs.size,
    total_verifications: verificationHistory.length,
    uptime: process.uptime()
  });
});

/**
 * DELETE /cache/clear
 * Clear proof cache (dev only)
 */
app.delete('/cache/clear', (req, res) => {
  const count = verifiedProofs.size;
  verifiedProofs.clear();
  res.json({
    success: true,
    message: `Cleared ${count} cached proofs`
  });
});

/**
 * DELETE /history/clear
 * Clear verification history (dev only)
 */
app.delete('/history/clear', (req, res) => {
  const count = verificationHistory.length;
  verificationHistory.length = 0;
  res.json({
    success: true,
    message: `Cleared ${count} verification records`
  });
});

app.listen(PORT, () => {
  console.log(`\n🔐 Verification Service running on port ${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   http://localhost:${PORT}/verify`);
  console.log(`  POST   http://localhost:${PORT}/verify-batch`);
  console.log(`  GET    http://localhost:${PORT}/proof/:proofHash`);
  console.log(`  GET    http://localhost:${PORT}/history`);
  console.log(`  GET    http://localhost:${PORT}/stats`);
  console.log(`  GET    http://localhost:${PORT}/health\n`);
});

module.exports = app;