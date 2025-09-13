#!/usr/bin/env node
// Generate Groth16 proof for IoTeX ProximityVerification6 circuit using snarkjs
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
    // Expect: { deviceIdHash, x, y, distanceSquared, timestamp, nonce }
    const input = {
      deviceIdHash: (payload.deviceIdHash ?? '0').toString(),
      x: (payload.x ?? 0).toString(),
      y: (payload.y ?? 0).toString(),
      distanceSquared: (payload.distanceSquared ?? 0).toString(),
      timestamp: (payload.timestamp ?? Math.floor(Date.now() / 1000)).toString(),
      nonce: (payload.nonce ?? Math.floor(Math.random() * 1000000)).toString()
    };

    const wasmPath = path.join(__dirname, '..', 'circuits', 'ProximityVerification6_js', 'ProximityVerification6.wasm');
    const zkeyPath = path.join(__dirname, '..', 'circuits', 'proximity6_final.zkey');

    if (!fs.existsSync(wasmPath)) throw new Error(`WASM not found at ${wasmPath}`);
    if (!fs.existsSync(zkeyPath)) throw new Error(`ZKEY not found at ${zkeyPath}`);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

    // Format proof in the standard Solidity layout (same as other scripts)
    const formatted = {
      a: [proof.pi_a[0], proof.pi_a[1]],
      b: [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]]
      ],
      c: [proof.pi_c[0], proof.pi_c[1]]
    };

    process.stdout.write(JSON.stringify({ success: true, proof: formatted, publicSignals }));
  } catch (e) {
    process.stderr.write(String(e && e.stack ? e.stack : e));
    process.exit(1);
  }
})();

