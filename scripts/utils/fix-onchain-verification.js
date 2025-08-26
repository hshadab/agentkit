// Quick fix for on-chain verification hanging issue
// The problem: SNARK generation takes 10-20 seconds and blocks the HTTP request

const fs = require('fs');
const path = require('path');

console.log(`
ISSUE IDENTIFIED:
================
On-chain verification is hanging because:

1. When you click "Verify on Ethereum/Solana", it calls /api/proof/{id}/ethereum
2. This triggers convert_nova_to_groth16() which runs generate_snark_proof.js
3. SNARK generation takes 10-20+ seconds (it's computationally intensive)
4. The HTTP request times out before SNARK generation completes
5. The UI shows as hanging/unresponsive

TEMPORARY WORKAROUNDS:
=====================
1. Pre-generate SNARK proofs in the background after Nova proof generation
2. Use cached/mock proofs for demo purposes
3. Show a proper loading state in the UI with progress updates

PERMANENT SOLUTION:
==================
Make SNARK generation asynchronous:
- Queue SNARK generation jobs when proofs are created
- Poll for completion status
- Show progress in the UI
- Cache generated SNARKs for reuse

For now, you can:
1. Wait longer (up to 30 seconds) for verification to complete
2. Use proofs that already have cached SNARKs
3. Use the mock verification mode if available
`);

// Check if any recent proofs have pre-generated SNARKs
const proofsDir = './proofs';
const recentProofs = fs.readdirSync(proofsDir)
    .filter(d => d.startsWith('proof_'))
    .slice(-10);

console.log('\nRecent proofs:');
recentProofs.forEach(proofId => {
    const snarkPath = path.join(proofsDir, proofId, 'snark_proof.json');
    const hasSNARK = fs.existsSync(snarkPath);
    console.log(`- ${proofId}: ${hasSNARK ? '✓ Has SNARK' : '✗ No SNARK'}`);
});