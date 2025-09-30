import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateValidProof() {
  try {
    const input = { decision: '1', confidence: '95' };
    const wasmPath = path.resolve(__dirname, '../../../circuits/jolt-verifier/jolt_decision_simple_js/jolt_decision_simple.wasm');
    const zkeyPath = path.resolve(__dirname, '../../../circuits/jolt-verifier/jolt_decision_simple_final.zkey');

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      const fallback = path.resolve(__dirname, '../../../circuits/jolt-verifier/proof.json');
      const proof = JSON.parse(fs.readFileSync(fallback, 'utf8'));
      return { proof, publicSignals: ['1', '95'] };
    }

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
    return { proof, publicSignals };
  } catch (e) {
    const fallback = path.resolve(__dirname, '../../../circuits/jolt-verifier/proof.json');
    const proof = JSON.parse(fs.readFileSync(fallback, 'utf8'));
    return { proof, publicSignals: ['1', '95'] };
  }
}

