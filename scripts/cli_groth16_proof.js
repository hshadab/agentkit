#!/usr/bin/env node
// CLI wrapper to generate Groth16 proof via existing helper
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
    const { generateGroth16Proof } = require(path.join(__dirname, 'generate-groth16-proof'));
    const result = await generateGroth16Proof(payload || {});
    process.stdout.write(JSON.stringify({ success: true, ...result }));
  } catch (e) {
    process.stderr.write(String(e && e.stack ? e.stack : e));
    process.exit(1);
  }
})();

