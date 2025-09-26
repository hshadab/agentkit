#!/usr/bin/env node

// Generate a valid Groth16 proof for the JOLT decision circuit
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

async function generateProof() {
  try {
    console.log('[proof-gen] Generating valid Groth16 proof for JOLT decision circuit...');
    
    // Input for the circuit (decision and confidence)
    const input = {
      decision: "1",      // Approved
      confidence: "95"    // 95% confidence
    };
    
    // Paths to circuit files
    const wasmPath = path.join(__dirname, '../circuits/jolt-verifier/jolt_decision_simple_js/jolt_decision_simple.wasm');
    const zkeyPath = path.join(__dirname, '../circuits/jolt-verifier/jolt_decision_simple_final.zkey');
    
    // Check if files exist
    if (!fs.existsSync(wasmPath)) {
      console.error('[proof-gen] WASM file not found:', wasmPath);
      console.log('[proof-gen] Using pre-generated proof instead');
      return {
        proof: JSON.parse(fs.readFileSync(path.join(__dirname, '../circuits/jolt-verifier/proof.json'), 'utf8')),
        publicSignals: ["1", "95"]
      };
    }
    
    if (!fs.existsSync(zkeyPath)) {
      console.error('[proof-gen] zkey file not found:', zkeyPath);
      console.log('[proof-gen] Using pre-generated proof instead');
      return {
        proof: JSON.parse(fs.readFileSync(path.join(__dirname, '../circuits/jolt-verifier/proof.json'), 'utf8')),
        publicSignals: ["1", "95"]
      };
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
    
    // Fallback to pre-generated proof
    console.log('[proof-gen] Using pre-generated proof as fallback');
    const proof = JSON.parse(fs.readFileSync(path.join(__dirname, '../circuits/jolt-verifier/proof.json'), 'utf8'));
    return {
      proof,
      publicSignals: ["1", "95"]
    };
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