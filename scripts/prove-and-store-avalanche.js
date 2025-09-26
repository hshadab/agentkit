#!/usr/bin/env node
const snarkjs = require('snarkjs');
const path = require('path');
const circomlib = require('circomlibjs');
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  // 1) Generate real Groth16 proof for RealProofOfProof
  const wasm = path.join(__dirname, '..', 'build', 'RealProofOfProof_js', 'RealProofOfProof_js', 'RealProofOfProof.wasm');
  const zkey = path.join(__dirname, '..', 'build', 'real_proof_of_proof_final.zkey');

  const poseidon = await circomlib.buildPoseidon();
  const F = poseidon.F;

  const now = Math.floor(Date.now() / 1000);
  const timestamp = Math.min(Math.max(now, 1704067201), 1893455900);
  const proofType = 2; // Location
  const userAddrHex = process.env.AVALANCHE_PUBLIC_ADDRESS || '0x2e408ad62e30146404F4ED8A61253212f3f9A490';
  const userAddress = BigInt(userAddrHex);

  const novaProofHash = 1234567890123456789n;
  const executionStepCount = 1000n;
  const finalStateHash = 9876543210987654321n;
  const verificationSeed = (1n << 80n) + 12345n;

  const kycData = 0n;
  const locationData = 42n;
  const aiContentHash = 0n;

  const commitmentInputs = [novaProofHash, executionStepCount, finalStateHash, verificationSeed].map(x => F.e(x));
  const novaProofCommitment = F.toObject(poseidon(commitmentInputs)).toString();

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

  console.log('🔧 Generating Groth16 proof...');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  console.log('✅ Proof generated. nPublic =', publicSignals.length);

  const solidityProof = {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
    c: [proof.pi_c[0], proof.pi_c[1]]
  };

  // 2) Send verifyAndStore tx on Avalanche Fuji
  const RPC = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
  const CHAIN_ID = Number(process.env.AVALANCHE_CHAIN_ID || 43113);
  let pk = process.env.AVALANCHE_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!pk) throw new Error('Missing AVALANCHE_PRIVATE_KEY/PRIVATE_KEY');
  if (!pk.startsWith('0x')) pk = '0x' + pk;

  const storageAddr = require('fs').existsSync(path.join(__dirname, '..', 'deployments', 'avax-groth16-storage-fuji.json'))
    ? JSON.parse(require('fs').readFileSync(path.join(__dirname, '..', 'deployments', 'avax-groth16-storage-fuji.json'), 'utf8')).address
    : null;
  if (!storageAddr) throw new Error('Storage contract not found');

  const ABI = [
    {
      "inputs": [
        { "name": "a", "type": "uint256[2]" },
        { "name": "b", "type": "uint256[2][2]" },
        { "name": "c", "type": "uint256[2]" },
        { "name": "input", "type": "uint256[6]" }
      ],
      "name": "verifyAndStore",
      "outputs": [ { "name": "", "type": "bool" } ],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  const provider = new ethers.JsonRpcProvider(RPC, { chainId: CHAIN_ID, name: 'avalanche-fuji' });
  const wallet = new ethers.Wallet(pk, provider);
  console.log('Deployer:', wallet.address);
  console.log('Storage:', storageAddr);

  const contract = new ethers.Contract(storageAddr, ABI, wallet);
  console.log('⛓️  Sending verifyAndStore...');
  const tx = await contract.verifyAndStore(solidityProof.a, solidityProof.b, solidityProof.c, publicSignals);
  console.log('Tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('✅ Mined in block', receipt.blockNumber, 'https://testnet.snowtrace.io/tx/' + tx.hash);
}

main().catch(e => { console.error(e); process.exit(1); });

