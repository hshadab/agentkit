#!/usr/bin/env node
// Generates a REAL Groth16 proof for RealProofOfProof and calls the storage verifier on Avalanche Fuji
const snarkjs = require('snarkjs');
const path = require('path');
const circomlib = require('circomlibjs');

async function main() {
  const wasm = path.join(__dirname, '..', 'build', 'RealProofOfProof_js', 'RealProofOfProof_js', 'RealProofOfProof.wasm');
  const zkey = path.join(__dirname, '..', 'build', 'real_proof_of_proof_final.zkey');

  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  // Choose valid inputs per circuit constraints
  const now = Math.floor(Date.now() / 1000);
  const timestamp = Math.min(Math.max(now, 1704067201), 1893455900); // clamp inside [2024,2030)
  const proofType = 2; // Location
  const userAddrHex = '0x2e408ad62e30146404F4ED8A61253212f3f9A490';
  const userAddress = BigInt(userAddrHex);

  const novaProofHash = 1234567890123456789n; // arbitrary non-zero
  const executionStepCount = 1000n; // within [100,1_000_000]
  const finalStateHash = 9876543210987654321n; // arbitrary non-zero
  const verificationSeed = (1n << 80n) + 12345n; // > 2**64

  // Type-specific data: for Location, locationData must be non-zero
  const kycData = 0n;
  const locationData = 42n;
  const aiContentHash = 0n;

  // Compute novaProofCommitment = Poseidon(novaProofHash, executionStepCount, finalStateHash, verificationSeed)
  const commitmentInputs = [novaProofHash, executionStepCount, finalStateHash, verificationSeed].map(x => F.e(x));
  const novaProofCommitment = F.toObject(poseidon(commitmentInputs)).toString();

  // Build input for witness
  const input = {
    novaProofCommitment: novaProofCommitment,
    proofType: proofType.toString(),
    timestamp: timestamp.toString(),
    userAddress: userAddress.toString(),
    novaProofHash: novaProofHash.toString(),
    executionStepCount: executionStepCount.toString(),
    finalStateHash: finalStateHash.toString(),
    verificationSeed: verificationSeed.toString(),
    kycData: kycData.toString(),
    locationData: locationData.toString(),
    aiContentHash: aiContentHash.toString()
  };

  console.log('Generating Groth16 proof (RealProofOfProof)...');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  console.log('Proof generated. Public signals:', publicSignals);

  // Convert to Solidity-friendly structure
  const solidityProof = {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
    c: [proof.pi_c[0], proof.pi_c[1]]
  };

  // Call backend storage verify endpoint (Fuji)
  const url = 'http://localhost:8001/medical/groth16-verify-store';
  const body = {
    proof: { a: solidityProof.a, b: solidityProof.b, c: solidityProof.c },
    publicSignals: publicSignals
  };
  console.log('Calling storage verifier:', url);
  const resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await resp.json();
  console.log('Response:', json);
}

main().catch(err => { console.error(err); process.exit(1); });
