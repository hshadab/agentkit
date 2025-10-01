#!/usr/bin/env node

const fs = require('fs');
const { ethers } = require('ethers');

const proofData = JSON.parse(fs.readFileSync('/tmp/fresh-proof.json', 'utf8'));
const proof = proofData.proof;
const publicSignals = proofData.publicSignals;

console.log('\n🧪 Testing Fresh Proof\n');
console.log('Public signals:', publicSignals);

async function test() {
  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const VERIFIER_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';

  const verifierABI = [
    'function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[2] memory input) public view returns (bool)'
  ];

  const contract = new ethers.Contract(VERIFIER_ADDRESS, verifierABI, provider);

  // Test 1: Direct ethers.js call
  console.log('\n1️⃣ Testing with direct ethers.js call...');
  try {
    const result = await contract.verifyProof(
      proof.pi_a,
      proof.pi_b,
      proof.pi_c,
      publicSignals
    );

    if (result) {
      console.log('✅ DIRECT VERIFICATION PASSED');
    } else {
      console.log('❌ DIRECT VERIFICATION RETURNED FALSE');
    }
  } catch (error) {
    console.log('❌ DIRECT VERIFICATION FAILED:', error.message.substring(0, 100));
  }

  // Test 2: Via onchain verification service
  console.log('\n2️⃣ Testing via onchain-verification-service...');
  try {
    const response = await fetch('http://localhost:9004/verify-onchain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof, publicSignals })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ SERVICE VERIFICATION PASSED');
    } else {
      console.log('❌ SERVICE VERIFICATION FAILED:', result.error || result.message);
    }
  } catch (error) {
    console.log('❌ SERVICE VERIFICATION ERROR:', error.message);
  }

  console.log('\n');
}

test().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
