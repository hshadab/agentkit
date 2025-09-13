#!/usr/bin/env node
// Generate Groth16 proof for AI Prediction Simple circuit
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');

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
    const wasm = path.join(__dirname, '..', 'circuits', 'AIPredictionSimple_js', 'AIPredictionSimple.wasm');
    const zkey = path.join(__dirname, '..', 'circuits', 'ai_simple_0000.zkey');
    if (!fs.existsSync(wasm)) throw new Error(`WASM not found at ${wasm}`);
    if (!fs.existsSync(zkey)) throw new Error(`ZKEY not found at ${zkey}`);

    const input = {
      prompt: String(payload.prompt || 0),
      response: String(payload.response || 0),
      nonce: String(payload.nonce || 0)
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
    const formatted = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
      c: [proof.pi_c[0], proof.pi_c[1]],
      input: publicSignals
    };
    process.stdout.write(JSON.stringify({ success: true, proof: formatted, publicSignals }));
  } catch (e) {
    process.stderr.write(String(e && e.stack ? e.stack : e));
    process.exit(1);
  }
})();

