#!/usr/bin/env node

const fs = require('fs');
const { ethers } = require('ethers');

const proofData = JSON.parse(fs.readFileSync('/tmp/fresh-proof.json', 'utf8'));
const proof = proofData.proof;
const publicSignals = proofData.publicSignals;

// Same ABI as service
const VERIFIER_ABI = [{
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
}];

// Create contract interface
const iface = new ethers.Interface(VERIFIER_ABI);

// Encode calldata with parameters exactly as they are
const calldata1 = iface.encodeFunctionData('verifyProof', [
  proof.pi_a,
  proof.pi_b,
  proof.pi_c,
  publicSignals
]);

console.log('\n📊 Calldata Analysis\n');
console.log('Proof pi_a:', proof.pi_a);
console.log('Proof pi_b:', JSON.stringify(proof.pi_b, null, 2));
console.log('Proof pi_c:', proof.pi_c);
console.log('Public signals:', publicSignals);
console.log('\nEncoded calldata:', calldata1);
console.log('Calldata length:', calldata1.length);

// Now check what the formatProofForContract function does
function formatProofForContract(proof, publicSignals) {
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
const calldata2 = iface.encodeFunctionData('verifyProof', [
  formatted.pA,
  formatted.pB,
  formatted.pC,
  formatted.pubSignals
]);

console.log('\nFormatted pA:', formatted.pA);
console.log('Formatted pB:', JSON.stringify(formatted.pB, null, 2));
console.log('Formatted pC:', formatted.pC);
console.log('Formatted pubSignals:', formatted.pubSignals);
console.log('\nEncoded calldata (formatted):', calldata2);
console.log('Calldata length:', calldata2.length);

console.log('\nCalldata match:', calldata1 === calldata2);

if (calldata1 !== calldata2) {
  console.log('\n⚠️  CALLDATA MISMATCH - This is the problem!');
  console.log('Finding first difference...');

  for (let i = 0; i < Math.max(calldata1.length, calldata2.length); i += 2) {
    if (calldata1.substr(i, 2) !== calldata2.substr(i, 2)) {
      console.log(`First difference at byte ${i/2}: ${calldata1.substr(i, 10)} vs ${calldata2.substr(i, 10)}`);
      break;
    }
  }
}
