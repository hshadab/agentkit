#!/usr/bin/env node
const snarkjs = require('snarkjs');
const path = require('path');
const circomlib = require('circomlibjs');
const { Web3 } = require('web3');
require('dotenv').config();

async function main() {
  // Generate proof
  const wasm = path.join(__dirname, '..', 'build', 'RealProofOfProof_js', 'RealProofOfProof_js', 'RealProofOfProof.wasm');
  const zkey = path.join(__dirname, '..', 'build', 'real_proof_of_proof_final.zkey');
  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  const now = Math.floor(Date.now()/1000);
  const timestamp = Math.min(Math.max(now, 1704067201), 1893455900);
  const proofType = 2;
  const userAddr = process.env.AVALANCHE_PUBLIC_ADDRESS || '0x2e408ad62e30146404F4ED8A61253212f3f9A490';
  const userAddress = BigInt(userAddr);

  const novaProofHash = 1234567890123456789n;
  const executionStepCount = 1000n;
  const finalStateHash = 9876543210987654321n;
  const verificationSeed = (1n<<80n) + 12345n;
  const kycData = 0n, locationData = 42n, aiContentHash = 0n;

  const cIn = [novaProofHash, executionStepCount, finalStateHash, verificationSeed].map(x=>F.e(x));
  const novaProofCommitment = F.toObject(poseidon(cIn)).toString();
  const inputObj = {
    novaProofCommitment, proofType: proofType.toString(), timestamp: timestamp.toString(), userAddress: userAddress.toString(),
    novaProofHash: novaProofHash.toString(), executionStepCount: executionStepCount.toString(), finalStateHash: finalStateHash.toString(), verificationSeed: verificationSeed.toString(),
    kycData: kycData.toString(), locationData: locationData.toString(), aiContentHash: aiContentHash.toString()
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputObj, wasm, zkey);
  const a = [proof.pi_a[0], proof.pi_a[1]];
  const b = [[proof.pi_b[0][1], proof.pi_b[0][0]],[proof.pi_b[1][1], proof.pi_b[1][0]]];
  const c = [proof.pi_c[0], proof.pi_c[1]];

  // Call verifyProof (view) on Groth16 verifier
  const RPC = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
  const w3 = new Web3(RPC);
  const baseDepl = require('../data/deployment-avalanche-fuji-real.json');
  const verifierAddress = baseDepl.contractAddress;
  const ABI = [{
    "inputs": [
      { "name": "a", "type": "uint256[2]" },
      { "name": "b", "type": "uint256[2][2]" },
      { "name": "c", "type": "uint256[2]" },
      { "name": "input", "type": "uint256[6]" }
    ],
    "name": "verifyProof",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }];
  const contract = new w3.eth.Contract(ABI, verifierAddress);
  const ok = await contract.methods.verifyProof(a,b,c,publicSignals).call();
  console.log('verifyProof(view) =>', ok);
}

main().catch(e=>{console.error(e); process.exit(1);});

