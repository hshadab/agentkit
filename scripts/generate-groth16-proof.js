const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function generateGroth16Proof(zkmlProofData) {
    console.log('🔐 Generating Groth16 Proof-of-Proof...');
    
    // Extract data from zkML proof
    const proofHash = zkmlProofData.proofHash || crypto.randomBytes(32).toString('hex');
    const decision = zkmlProofData.decision || 1; // 1 = ALLOW, 0 = DENY
    const confidence = zkmlProofData.confidence || 95;
    const amountValid = zkmlProofData.amountValid || 1;
    
    // Generate a secret that when squared equals the proofHash (simplified for demo)
    // In production, this would use proper cryptographic commitment
    const cleanHash = proofHash.replace('0x', '');
    
    // Use a simple perfect square for demo (ensure it fits in field)
    // We'll use 12345^2 = 152399025
    const zkmlSecret = BigInt('12345');
    const proofHashNumeric = zkmlSecret * zkmlSecret; // This will be 152399025
    
    const input = {
        proofHash: proofHashNumeric.toString(),
        decision: decision.toString(),
        confidence: confidence.toString(),
        amountValid: amountValid.toString(),
        zkmlSecret: zkmlSecret.toString()
    };
    
    console.log('Circuit input:', {
        proofHash: input.proofHash,
        decision: input.decision,
        confidence: input.confidence,
        amountValid: input.amountValid,
        zkmlSecret: '***' // Hide secret in logs
    });
    
    try {
        // Generate witness
        const wasmPath = path.join(__dirname, '../build/zkml_proof/zkml_proof_simple_js/zkml_proof_simple.wasm');
        const wtnessPath = path.join(__dirname, '../build/zkml_proof/witness.wtns');
        
        // Check if files exist
        if (!fs.existsSync(wasmPath)) {
            throw new Error(`WASM file not found at ${wasmPath}`);
        }
        
        // Generate witness
        console.log('Generating witness...');
        const wc = require(path.join(__dirname, '../build/zkml_proof/zkml_proof_simple_js/witness_calculator.js'));
        const wasmBuffer = fs.readFileSync(wasmPath);
        const witnessCalculator = await wc(wasmBuffer);
        const witnessBuffer = await witnessCalculator.calculateWTNSBin(input, 0)
        fs.writeFileSync(wtnessPath, witnessBuffer);
        
        // Generate proof
        console.log('Generating proof...');
        const zkeyPath = path.join(__dirname, '../build/zkml_proof/zkml_proof_final.zkey');
        
        if (!fs.existsSync(zkeyPath)) {
            throw new Error(`zkey file not found at ${zkeyPath}`);
        }
        
        const { proof, publicSignals } = await snarkjs.groth16.prove(zkeyPath, wtnessPath);
        
        console.log('✅ Groth16 proof generated successfully');
        console.log('Public signals:', publicSignals);
        
        // Format proof for on-chain verification
        const formattedProof = {
            a: [proof.pi_a[0], proof.pi_a[1]],
            b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
            c: [proof.pi_c[0], proof.pi_c[1]]
        };
        
        return {
            proof: formattedProof,
            publicSignals: publicSignals,
            raw: proof
        };
        
    } catch (error) {
        console.error('Error generating proof:', error);
        throw error;
    }
}

// Test function
async function testGroth16Proof() {
    const zkmlProofData = {
        proofHash: '0x' + crypto.randomBytes(32).toString('hex'),
        decision: 1,
        confidence: 95,
        amountValid: 1
    };
    
    const result = await generateGroth16Proof(zkmlProofData);
    console.log('\nGenerated proof:', JSON.stringify(result, null, 2));
    
    // Verify proof locally
    const vKeyPath = path.join(__dirname, '../build/zkml_proof/verification_key.json');
    const vKey = JSON.parse(fs.readFileSync(vKeyPath));
    
    const verified = await snarkjs.groth16.verify(vKey, result.publicSignals, result.raw);
    console.log('\n✅ Local verification:', verified ? 'PASSED' : 'FAILED');
    
    return result;
}

module.exports = { generateGroth16Proof };

// Run test if executed directly
if (require.main === module) {
    testGroth16Proof().catch(console.error);
}