#!/usr/bin/env node

/**
 * Test verification in the same context as the backend service
 * This will use the exact same initialization code
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const proofData = JSON.parse(fs.readFileSync('/tmp/fresh-proof.json', 'utf8'));
const proof = proofData.proof;
const publicSignals = proofData.publicSignals;

console.log('\n🧪 Testing in Backend Service Context\n');

async function testInServiceContext() {
  try {
    // Use EXACT same initialization as onchain-verification-service.js
    const VERIFIER_ADDRESS = process.env.BASE_VERIFIER_ADDRESS || '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';

    const VERIFIER_ABI = [
      {
        "inputs": [
          { "internalType": "uint256[2]", "name": "_pA", "type": "uint256[2]" },
          { "internalType": "uint256[2][2]", "name": "_pB", "type": "uint256[2][2]" },
          { "internalType": "uint256[2]", "name": "_pC", "type": "uint256[2]" },
          { "internalType": "uint256[]", "name": "_pubSignals", "type": "uint256[]" }
        ],
        "name": "verifyProof",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    // Test 1: Service initialization (with network config)
    console.log('1️⃣ Testing with service initialization (with network config)...');
    try {
      const RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
      const provider1 = new ethers.JsonRpcProvider(RPC_URL, {
        chainId: 84532,
        name: 'base-sepolia'
      });

      const contract1 = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, provider1);

      const result1 = await contract1.verifyProof(
        proof.pi_a,
        proof.pi_b,
        proof.pi_c,
        publicSignals
      );

      console.log('   Result:', result1 ? '✅ PASSED' : '❌ FAILED');
    } catch (error) {
      console.log('   ❌ ERROR:', error.message.substring(0, 100));
    }

    // Test 2: Simple initialization (no network config)
    console.log('\n2️⃣ Testing with simple initialization (no network config)...');
    try {
      const RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
      const provider2 = new ethers.JsonRpcProvider(RPC_URL);

      const contract2 = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, provider2);

      const result2 = await contract2.verifyProof(
        proof.pi_a,
        proof.pi_b,
        proof.pi_c,
        publicSignals
      );

      console.log('   Result:', result2 ? '✅ PASSED' : '❌ FAILED');
    } catch (error) {
      console.log('   ❌ ERROR:', error.message.substring(0, 100));
    }

    // Test 3: Check .env BASE_VERIFIER_ADDRESS
    console.log('\n3️⃣ Environment check:');
    console.log('   BASE_VERIFIER_ADDRESS:', process.env.BASE_VERIFIER_ADDRESS);
    console.log('   BASE_RPC_URL:', process.env.BASE_RPC_URL || 'https://sepolia.base.org (default)');

    console.log('\n');
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

testInServiceContext()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
