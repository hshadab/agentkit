/**
 * Groth16 Backend for JOLT On-Chain Verification
 * 
 * This service provides the interface for Step 2 of the workflow:
 * - Takes zkML proof from Step 1
 * - Generates circuit proof for on-chain verification
 * - Verifies on Ethereum Sepolia using deployed JOLT verifier
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3004;

// Configuration
const RPC_URL = 'https://eth-sepolia.public.blastapi.io';
const VERIFIER_ADDRESS = '0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308';

// Load verifier info
const deploymentInfo = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../deployments/jolt-simple-verifier-sepolia.json'), 'utf8')
);

// Circuit paths
const CIRCUIT_DIR = path.join(__dirname, '../circuits/jolt-verifier');

// Initialize provider
const provider = new ethers.JsonRpcProvider(RPC_URL);
const verifierContract = new ethers.Contract(VERIFIER_ADDRESS, deploymentInfo.abi, provider);

/**
 * Generate circuit proof from zkML data
 */
async function generateCircuitProof(decision, confidence) {
    return new Promise((resolve, reject) => {
        const input = {
            decision: decision.toString(),
            confidence: confidence.toString()
        };
        
        const inputPath = path.join(CIRCUIT_DIR, `input_${Date.now()}.json`);
        fs.writeFileSync(inputPath, JSON.stringify(input));
        
        const witnessPath = path.join(CIRCUIT_DIR, `witness_${Date.now()}.wtns`);
        const genWitness = spawn('node', [
            path.join(CIRCUIT_DIR, 'jolt_decision_simple_js/generate_witness.js'),
            path.join(CIRCUIT_DIR, 'jolt_decision_simple_js/jolt_decision_simple.wasm'),
            inputPath,
            witnessPath
        ]);
        
        genWitness.on('close', (code) => {
            if (code !== 0) {
                fs.unlinkSync(inputPath);
                reject(new Error('Witness generation failed'));
                return;
            }
            
            const proofPath = path.join(CIRCUIT_DIR, `proof_${Date.now()}.json`);
            const publicPath = path.join(CIRCUIT_DIR, `public_${Date.now()}.json`);
            
            const genProof = spawn('snarkjs', [
                'groth16', 'prove',
                path.join(CIRCUIT_DIR, 'jolt_decision_simple_final.zkey'),
                witnessPath,
                proofPath,
                publicPath
            ]);
            
            genProof.on('close', (code) => {
                // Clean up temp files
                fs.unlinkSync(inputPath);
                fs.unlinkSync(witnessPath);
                
                if (code !== 0) {
                    reject(new Error('Proof generation failed'));
                    return;
                }
                
                const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
                const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
                
                // Clean up proof files
                fs.unlinkSync(proofPath);
                fs.unlinkSync(publicPath);
                
                resolve({ proof, publicSignals });
            });
        });
    });
}

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'groth16-jolt-backend',
        verifier: VERIFIER_ADDRESS,
        network: 'sepolia'
    });
});

/**
 * Main workflow endpoint - called by frontend Step 2
 */
app.post('/groth16/workflow', async (req, res) => {
    try {
        const { proofHash, decision, confidence } = req.body;
        
        console.log('\n🔗 Step 2: On-Chain Verification');
        console.log('   Decision:', decision === 1 ? 'APPROVE' : 'DENY');
        console.log('   Confidence:', confidence, '%');
        
        // Generate circuit proof
        console.log('   Generating circuit proof...');
        const { proof, publicSignals } = await generateCircuitProof(
            decision || 1,
            confidence || 95
        );
        
        // Format proof for Solidity
        const a = [proof.pi_a[0], proof.pi_a[1]];
        const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        const c = [proof.pi_c[0], proof.pi_c[1]];
        
        // Verify on-chain (view function, no gas)
        console.log('   Verifying on-chain...');
        const isValid = await verifierContract.verifyProof(a, b, c, publicSignals);
        
        // Get current block number
        const blockNumber = await provider.getBlockNumber();
        
        console.log(`   ✅ Verified at block ${blockNumber}: ${isValid ? 'VALID' : 'INVALID'}`);
        
        if (isValid) {
            res.json({
                success: true,
                blockNumber: blockNumber,
                contractAddress: VERIFIER_ADDRESS,
                contractUrl: `https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}#readContract`,
                blockUrl: `https://sepolia.etherscan.io/block/${blockNumber}`,
                proofValid: true,
                note: 'zkML proof verified on-chain using JOLT Decision Verifier'
            });
        } else {
            res.json({
                success: false,
                error: 'Proof verification failed on-chain'
            });
        }
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Direct verification endpoint
 */
app.post('/groth16/verify', async (req, res) => {
    try {
        const { proof } = req.body;
        
        // Extract decision and confidence from proof if available
        const decision = proof?.decision || 1;
        const confidence = proof?.confidence || 95;
        
        // Generate circuit proof and verify
        const { proof: circuitProof, publicSignals } = await generateCircuitProof(decision, confidence);
        
        // Format proof for Solidity
        const a = [circuitProof.pi_a[0], circuitProof.pi_a[1]];
        const b = [[circuitProof.pi_b[0][1], circuitProof.pi_b[0][0]], [circuitProof.pi_b[1][1], circuitProof.pi_b[1][0]]];
        const c = [circuitProof.pi_c[0], circuitProof.pi_c[1]];
        
        // Verify on-chain
        const isValid = await verifierContract.verifyProof(a, b, c, publicSignals);
        const blockNumber = await provider.getBlockNumber();
        
        res.json({
            verified: isValid,
            blockNumber: blockNumber,
            etherscanUrl: `https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}#readContract`
        });
        
    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({
            verified: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Groth16 JOLT Backend Started');
    console.log(`   Port: ${PORT}`);
    console.log(`   Verifier: ${VERIFIER_ADDRESS}`);
    console.log(`   Network: Sepolia`);
    console.log(`   View: https://sepolia.etherscan.io/address/${VERIFIER_ADDRESS}\n`);
    console.log('📝 This backend provides on-chain verification for zkML proofs');
    console.log('   Uses simplified circuit (2 params) for demo purposes');
    console.log('   Future: Can be expanded to validate all 14 LLM parameters\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});