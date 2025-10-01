#!/usr/bin/env node

// Generate a valid Groth16 proof for the JOLT decision circuit
// Option B: Supports a third public signal carrying a commitment (proofHash)
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate Groth16 proof for the decision circuit.
 * If `opts.proofHashF` is provided, it is passed as the `proofHash` input
 * for circuits that expose a third public signal [decision, confidence, proofHash].
 *
 * Environment overrides for circuit assets:
 * - X402_GROTH_WASM_PATH: absolute/relative path to circuit wasm
 * - X402_GROTH_ZKEY_PATH: absolute/relative path to circuit zkey
 */
async function generateProof(opts = {}) {
  try {
    console.log('[proof-gen] Generating valid Groth16 proof for JOLT decision circuit...');
    
    // Input for the circuit (decision and confidence; optional proofHash)
    const input = {
      decision: (opts && opts.decision != null) ? String(opts.decision) : "1",
      confidence: (opts && opts.confidence != null) ? String(opts.confidence) : "95"
    };
    let proofHashF = opts && opts.proofHashF;
    if (!proofHashF) {
      // Try environment-provided field or compute from JOLT_PROOF_PATH
      const envF = process.env.X402_PROOFHASH_F;
      if (envF) proofHashF = String(envF);
      if (!proofHashF && process.env.JOLT_PROOF_PATH && fs.existsSync(process.env.JOLT_PROOF_PATH)) {
        const bytes = fs.readFileSync(process.env.JOLT_PROOF_PATH);
        const hex = '0x' + crypto.createHash('sha256').update(bytes).digest('hex');
        // BN254 field mod
        const r = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        const f = (BigInt(hex) % r).toString();
        proofHashF = f;
      }
    }
    if (proofHashF) {
      // Circuits using Option B expect `proofHash` as the 3rd public signal
      input.proofHash = String(proofHashF);
      console.log('[proof-gen] Using proofHash signal:', input.proofHash);
    }
    
    // Paths to circuit files
    const wasmPath = process.env.X402_GROTH_WASM_PATH ||
      path.join(__dirname, '../circuits/jolt-verifier/jolt_decision_simple_js/jolt_decision_simple.wasm');
    const zkeyPath = process.env.X402_GROTH_ZKEY_PATH ||
      path.join(__dirname, '../circuits/jolt-verifier/jolt_decision_simple_final.zkey');
    
    // Enforce REAL-only mode: require WASM + zkey assets
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`WASM file not found: ${wasmPath}. Place the real circuit assets to proceed.`);
    }
    if (!fs.existsSync(zkeyPath)) {
      throw new Error(`zkey file not found: ${zkeyPath}. Place the real circuit assets to proceed.`);
    }
    
    // Generate the proof
    console.log('[proof-gen] Running snarkjs.groth16.fullProve...');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );
    
    console.log('[proof-gen] Proof generated successfully');
    console.log('[proof-gen] Public signals:', publicSignals);
    
    // Save for future use
    fs.writeFileSync(
      path.join(__dirname, 'generated-proof.json'),
      JSON.stringify({ proof, publicSignals }, null, 2)
    );
    
    return { proof, publicSignals };
    
  } catch (error) {
    console.error('[proof-gen] Error generating proof:', error.message);
    throw error;
  }
}

// Export for use in other modules
module.exports = { generateProof };

// Run if called directly
if (require.main === module) {
  generateProof().then(result => {
    console.log('[proof-gen] Result:', JSON.stringify(result, null, 2));
  }).catch(error => {
    console.error('[proof-gen] Fatal error:', error);
    process.exit(1);
  });
}
