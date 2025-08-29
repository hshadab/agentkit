/**
 * JOLT On-Chain Verification Backend
 * 
 * This service bridges JOLT-Atlas zkML proofs with on-chain verification
 * Uses the simplified circuit for demo (2 parameters: decision, confidence)
 * 
 * Future: Can be expanded to validate all 14 LLM parameters
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const PORT = 3005;
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const VERIFIER_ADDRESS = '0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308';

// Load verifier ABI
const deploymentInfo = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/jolt-simple-verifier-sepolia.json'), 'utf8')
);

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(RPC_URL);
const verifierContract = new ethers.Contract(VERIFIER_ADDRESS, deploymentInfo.abi, provider);

// Circuit paths
const CIRCUIT_DIR = path.join(__dirname, '../circuits/jolt-verifier');

/**
 * Generate circuit proof from JOLT-Atlas output
 */
async function generateCircuitProof(decision, confidence) {
    return new Promise((resolve, reject) => {
        // Create input for circuit
        const input = {
            decision: decision.toString(),
            confidence: confidence.toString()
        };
        
        const inputPath = path.join(CIRCUIT_DIR, 'input_onchain.json');
        fs.writeFileSync(inputPath, JSON.stringify(input));
        
        // Generate witness
        const witnessPath = path.join(CIRCUIT_DIR, 'witness_onchain.wtns');
        const genWitness = spawn('node', [
            path.join(CIRCUIT_DIR, 'jolt_decision_simple_js/generate_witness.js'),
            path.join(CIRCUIT_DIR, 'jolt_decision_simple_js/jolt_decision_simple.wasm'),
            inputPath,
            witnessPath
        ]);
        
        genWitness.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Witness generation failed'));
                return;
            }
            
            // Generate proof
            const proofPath = path.join(CIRCUIT_DIR, 'proof_onchain.json');
            const publicPath = path.join(CIRCUIT_DIR, 'public_onchain.json');
            
            const genProof = spawn('snarkjs', [
                'groth16', 'prove',
                path.join(CIRCUIT_DIR, 'jolt_decision_simple_final.zkey'),
                witnessPath,
                proofPath,
                publicPath
            ]);
            
            genProof.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Proof generation failed'));
                    return;
                }
                
                // Read generated proof
                const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
                const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
                
                resolve({ proof, publicSignals });
            });
        });
    });
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'jolt-onchain-backend',
        verifier: VERIFIER_ADDRESS,
        network: 'sepolia'
    });
});

/**
 * Generate and verify JOLT proof on-chain
 */
app.post('/jolt/verify', async (req, res) => {
    try {
        const { decision, confidence } = req.body;
        
        // Validate inputs
        if (decision === undefined || confidence === undefined) {
            return res.status(400).json({
                error: 'Missing required parameters: decision, confidence'
            });
        }
        
        // Convert to proper format (1 or 0 for decision, 0-100 for confidence)
        const decisionBit = decision === 'APPROVE' || decision === 1 ? 1 : 0;
        const confidenceScore = Math.min(100, Math.max(0, parseInt(confidence)));
        
        console.log(`\n🔨 Generating circuit proof for decision=${decisionBit}, confidence=${confidenceScore}`);
        
        // Generate circuit proof
        const { proof, publicSignals } = await generateCircuitProof(decisionBit, confidenceScore);
        
        console.log('✅ Circuit proof generated');
        
        // Format proof for Solidity
        const a = [proof.pi_a[0], proof.pi_a[1]];
        const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const c = [proof.pi_c[0], proof.pi_c[1]];
        
        // Verify on-chain
        console.log('🔗 Verifying on-chain...');
        const isValid = await verifierContract.verifyProof(a, b, c, publicSignals);
        
        console.log(`✅ On-chain verification: ${isValid ? 'VALID' : 'INVALID'}`);
        
        // Return result
        res.json({
            verified: isValid,
            decision: decisionBit === 1 ? 'APPROVE' : 'DENY',
            confidence: confidenceScore,
            verifier: VERIFIER_ADDRESS,
            network: 'sepolia',
            etherscanUrl: `https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}#readContract`,
            proof: {
                a: a,
                b: b,
                c: c,
                publicSignals: publicSignals
            }
        });
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            error: error.message,
            verified: false
        });
    }
});

/**
 * Direct proof verification (if you already have a proof)
 */
app.post('/jolt/verify-proof', async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;
        
        if (!proof || !publicSignals) {
            return res.status(400).json({
                error: 'Missing proof or publicSignals'
            });
        }
        
        // Format proof for Solidity
        const a = [proof.pi_a[0], proof.pi_a[1]];
        const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const c = [proof.pi_c[0], proof.pi_c[1]];
        
        // Verify on-chain
        const isValid = await verifierContract.verifyProof(a, b, c, publicSignals);
        
        res.json({
            verified: isValid,
            decision: publicSignals[0] === "1" ? 'APPROVE' : 'DENY',
            confidence: publicSignals[1],
            verifier: VERIFIER_ADDRESS,
            network: 'sepolia',
            etherscanUrl: `https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}#readContract`
        });
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            error: error.message,
            verified: false
        });
    }
});

/**
 * Get verifier info
 */
app.get('/jolt/verifier', (req, res) => {
    res.json({
        address: VERIFIER_ADDRESS,
        network: 'sepolia',
        etherscanUrl: `https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}`,
        publicInputs: ['decision', 'confidence'],
        note: 'Simplified circuit for demo. Future: Can validate all 14 LLM parameters.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 JOLT On-Chain Verification Backend');
    console.log(`   Port: ${PORT}`);
    console.log(`   Verifier: ${VERIFIER_ADDRESS}`);
    console.log(`   Network: Sepolia`);
    console.log(`   View: https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}\n`);
    console.log('📝 Note: This is a simplified circuit (2 params) for demo.');
    console.log('   Future expansion can validate all 14 LLM parameters.\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    process.exit(0);
});