#!/usr/bin/env node
// Generate Groth16 proof for JOLT decision verifier circuit (real proof-of-proof)
const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
}

(async () => {
  try {
    const inputStr = (await readStdin()) || '{}';
    const payload = JSON.parse(inputStr);
    const { decision = 1, confidence = 95, threshold = 80, proofHash = 123456n, timestamp = Math.floor(Date.now()/1000) } = payload;

    // Paths
    const cirDir = path.join(__dirname, '..', 'circuits', 'jolt-verifier');
    const wcPath = path.join(cirDir, 'jolt_decision_verifier_js', 'witness_calculator.js');
    const wasmPath = path.join(cirDir, 'jolt_decision_verifier_js', 'jolt_decision_verifier.wasm');
    const zkeyPath = path.join(cirDir, 'jolt_decision_verifier_final.zkey');

    if (!fs.existsSync(wcPath) || !fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      throw new Error('Missing circuit artifacts under circuits/jolt-verifier');
    }

    // Build witness
    const wc = require(wcPath);
    const wasmBuffer = fs.readFileSync(wasmPath);
    const witnessCalculator = await wc(wasmBuffer);
    const input = { decision, confidence, threshold, proofHash: String(proofHash), timestamp: String(timestamp) };
    const witness = await witnessCalculator.calculateWTNSBin(input, 0);
    const wtnsPath = path.join(cirDir, 'witness.wtns');
    fs.writeFileSync(wtnsPath, witness);

    // Prove
    const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, wtnsPath);

    // Format proof for Solidity verification
    const formatted = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
      c: [proof.pi_c[0], proof.pi_c[1]]
    };

    process.stdout.write(JSON.stringify({ success: true, proof: formatted, publicSignals }));
  } catch (e) {
    process.stderr.write(String(e && e.stack ? e.stack : e));
    process.exit(1);
  }
})();

