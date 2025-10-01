#!/usr/bin/env node

const fs = require('fs');
const { ethers } = require('ethers');

// Load the proof from the actual API response
const response = JSON.parse(fs.readFileSync('/tmp/proof-response.json', 'utf8'));
const proof = response.proof;
const publicSignals = response.publicSignals;

console.log('\n📊 Testing Proof Formatting\n');
console.log('=' .repeat(60));

// Current formatProofForContract logic
function formatProofForContract(proof, publicSignals) {
  const a = proof.pi_a || proof.a;
  const b = proof.pi_b || proof.b;
  const c = proof.pi_c || proof.c;

  return {
    pA: Array.isArray(a) ? a : [a[0], a[1]],
    pB: Array.isArray(b) && Array.isArray(b[0]) ? b : [
      [b[0][1], b[0][0]], // Reverse for contract
      [b[1][1], b[1][0]]
    ],
    pC: Array.isArray(c) ? c : [c[0], c[1]],
    pubSignals: publicSignals.map(s => BigInt(s).toString())
  };
}

// Alternative formatting (ensuring slicing)
function formatProofForContractAlt(proof, publicSignals) {
  const a = proof.pi_a || proof.a;
  const b = proof.pi_b || proof.b;
  const c = proof.pi_c || proof.c;

  return {
    pA: Array.isArray(a) ? a.slice(0, 2) : [a[0], a[1]],
    pB: Array.isArray(b) && Array.isArray(b[0])
      ? b.map(coord => Array.isArray(coord) ? coord.slice(0, 2) : coord)
      : [[b[0][1], b[0][0]], [b[1][1], b[1][0]]],
    pC: Array.isArray(c) ? c.slice(0, 2) : [c[0], c[1]],
    pubSignals: publicSignals.map(s => BigInt(s).toString())
  };
}

const formatted = formatProofForContract(proof, publicSignals);
const formattedAlt = formatProofForContractAlt(proof, publicSignals);

console.log('\n1️⃣ Current formatting:');
console.log('   pA length:', formatted.pA.length);
console.log('   pB structure:', formatted.pB.map(c => `[${c.length}]`).join(', '));
console.log('   pC length:', formatted.pC.length);
console.log('   pubSignals length:', formatted.pubSignals.length);

console.log('\n2️⃣ Alternative formatting:');
console.log('   pA length:', formattedAlt.pA.length);
console.log('   pB structure:', formattedAlt.pB.map(c => `[${c.length}]`).join(', '));
console.log('   pC length:', formattedAlt.pC.length);
console.log('   pubSignals length:', formattedAlt.pubSignals.length);

console.log('\n3️⃣ Are they equal?');
console.log('   pA equal:', JSON.stringify(formatted.pA) === JSON.stringify(formattedAlt.pA));
console.log('   pB equal:', JSON.stringify(formatted.pB) === JSON.stringify(formattedAlt.pB));
console.log('   pC equal:', JSON.stringify(formatted.pC) === JSON.stringify(formattedAlt.pC));
console.log('   pubSignals equal:', JSON.stringify(formatted.pubSignals) === JSON.stringify(formattedAlt.pubSignals));

// Test on-chain verification with both
async function testVerification() {
  console.log('\n4️⃣ Testing on-chain verification...\n');

  const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  const VERIFIER_ADDRESS = '0x3c4323fdBd592aaCF37C33dbF90e492CEe249599';

  const verifierABI = [
    'function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[2] memory input) public view returns (bool)'
  ];

  const contract = new ethers.Contract(VERIFIER_ADDRESS, verifierABI, provider);

  try {
    console.log('Testing current formatting...');
    const result1 = await contract.verifyProof(
      formatted.pA,
      formatted.pB,
      formatted.pC,
      formatted.pubSignals
    );
    console.log('✅ Current formatting: PASSED -', result1);
  } catch (error) {
    console.log('❌ Current formatting: FAILED -', error.message.substring(0, 80));
  }

  try {
    console.log('Testing alternative formatting...');
    const result2 = await contract.verifyProof(
      formattedAlt.pA,
      formattedAlt.pB,
      formattedAlt.pC,
      formattedAlt.pubSignals
    );
    console.log('✅ Alternative formatting: PASSED -', result2);
  } catch (error) {
    console.log('❌ Alternative formatting: FAILED -', error.message.substring(0, 80));
  }
}

testVerification()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Test complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
