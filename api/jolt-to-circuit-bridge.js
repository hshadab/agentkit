#!/usr/bin/env node

/**
 * JOLT to Circuit Bridge
 * 
 * This service converts JOLT-Atlas zkML proofs into circuit-compatible format
 * for on-chain verification. It's separate from the main workflow.
 * 
 * Port: 3006 (different from main services)
 */

const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 3006;

// Paths to circuit files
const CIRCUIT_DIR = path.join(__dirname, '../circuits/jolt-verifier');
const WASM_PATH = path.join(CIRCUIT_DIR, 'jolt_decision_verifier_js/jolt_decision_verifier.wasm');
const ZKEY_PATH = path.join(CIRCUIT_DIR, 'jolt_decision_verifier_final.zkey');
const VKEY_PATH = path.join(CIRCUIT_DIR, 'verification_key.json');

// Check if circuit files exist
let circuitReady = false;

function checkCircuitFiles() {
    const files = [WASM_PATH, ZKEY_PATH, VKEY_PATH];
    const missing = files.filter(f => !fs.existsSync(f));
    
    if (missing.length === 0) {
        circuitReady = true;
        console.log('✅ All circuit files found');
    } else {
        console.log('⚠️  Missing circuit files:', missing);
        console.log('   Run: cd circuits/jolt-verifier && ./setup_jolt_circuit.sh');
    }
    
    return circuitReady;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'jolt-to-circuit-bridge',
        port: PORT,
        circuitReady: checkCircuitFiles(),
        mode: 'EXPERIMENTAL - Not integrated with main workflow'
    });
});

/**
 * Convert JOLT proof to circuit input format
 */
function joltToCircuitInput(joltProof) {
    // Extract decision and confidence from JOLT proof
    const decision = joltProof.decision === 'ALLOW' ? 1 : 0;
    const confidence = joltProof.confidence || 95;
    const threshold = 80; // Standard threshold
    
    // Generate proof hash from JOLT proof bytes
    const proofHash = joltProof.proof?.hash 
        ? BigInt(joltProof.proof.hash).toString()
        : BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString();
    
    // Current timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    
    return {
        decision: decision.toString(),
        confidence: confidence.toString(),
        threshold: threshold.toString(),
        proofHash: proofHash,
        timestamp: timestamp.toString()
    };
}

/**
 * Generate Groth16 proof from JOLT data
 */
app.post('/convert/jolt-to-groth16', async (req, res) => {
    try {
        if (!circuitReady) {
            return res.status(503).json({
                error: 'Circuit not ready',
                message: 'Run setup_jolt_circuit.sh first'
            });
        }
        
        const { joltProof } = req.body;
        
        if (!joltProof) {
            return res.status(400).json({ error: 'Missing joltProof' });
        }
        
        console.log('🔄 Converting JOLT proof to Groth16...');
        console.log('  Decision:', joltProof.decision);
        console.log('  Confidence:', joltProof.confidence);
        
        // Convert JOLT proof to circuit input
        const circuitInput = joltToCircuitInput(joltProof);
        
        // Write input to temp file
        const inputPath = path.join(CIRCUIT_DIR, `input_${Date.now()}.json`);
        fs.writeFileSync(inputPath, JSON.stringify(circuitInput));
        
        try {
            // Calculate witness
            const witness = await snarkjs.wtns.calculate(
                circuitInput,
                WASM_PATH
            );
            
            // Generate proof
            const { proof, publicSignals } = await snarkjs.groth16.prove(
                ZKEY_PATH,
                witness
            );
            
            console.log('✅ Groth16 proof generated');
            console.log('  Public signals:', publicSignals);
            
            // Format for Solidity
            const solidityProof = {
                a: [proof.pi_a[0], proof.pi_a[1]],
                b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
                c: [proof.pi_c[0], proof.pi_c[1]],
                publicSignals: publicSignals
            };
            
            // Verify the proof
            const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
            const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            
            res.json({
                success: true,
                verified,
                proof: solidityProof,
                publicSignals,
                metadata: {
                    decision: publicSignals[0],
                    confidence: publicSignals[1],
                    threshold: publicSignals[2],
                    timestamp: new Date().toISOString()
                }
            });
            
        } finally {
            // Clean up temp file
            if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }
        }
        
    } catch (error) {
        console.error('Error converting proof:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Failed to convert JOLT proof to Groth16'
        });
    }
});

/**
 * Verify a Groth16 proof
 */
app.post('/verify/groth16', async (req, res) => {
    try {
        if (!circuitReady) {
            return res.status(503).json({
                error: 'Circuit not ready',
                message: 'Run setup_jolt_circuit.sh first'
            });
        }
        
        const { proof, publicSignals } = req.body;
        
        // Load verification key
        const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
        
        // Verify the proof
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        res.json({
            valid: isValid,
            decision: publicSignals[0],
            confidence: publicSignals[1],
            threshold: publicSignals[2]
        });
        
    } catch (error) {
        console.error('Error verifying proof:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generate Solidity calldata for on-chain verification
 */
app.post('/generate/calldata', async (req, res) => {
    try {
        const { proof, publicSignals } = req.body;
        
        // Format proof for Solidity function call
        const a = [proof.a[0], proof.a[1]];
        const b = [[proof.b[0][0], proof.b[0][1]], [proof.b[1][0], proof.b[1][1]]];
        const c = [proof.c[0], proof.c[1]];
        
        // Generate calldata
        const calldata = ethers.utils.defaultAbiCoder.encode(
            ['uint256[2]', 'uint256[2][2]', 'uint256[2]', 'uint256[3]'],
            [a, b, c, publicSignals]
        );
        
        res.json({
            success: true,
            calldata,
            functionSig: 'verifyAndStore(uint256[2],uint256[2][2],uint256[2],uint256[3])',
            params: {
                a, b, c,
                publicSignals
            }
        });
        
    } catch (error) {
        console.error('Error generating calldata:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Test endpoint - full pipeline from JOLT to on-chain ready proof
 */
app.post('/test/full-pipeline', async (req, res) => {
    try {
        // Simulate JOLT proof
        const mockJoltProof = {
            decision: 'ALLOW',
            confidence: 95,
            riskScore: 5,
            proof: {
                framework: 'JOLT-Atlas',
                hash: '0x' + crypto.randomBytes(32).toString('hex'),
                proof_bytes: Array(512).fill(0)
            }
        };
        
        // Convert to circuit input
        const circuitInput = joltToCircuitInput(mockJoltProof);
        
        // Generate Groth16 proof
        if (circuitReady) {
            const witness = await snarkjs.wtns.calculate(
                circuitInput,
                WASM_PATH
            );
            
            const { proof, publicSignals } = await snarkjs.groth16.prove(
                ZKEY_PATH,
                witness
            );
            
            // Verify
            const vKey = JSON.parse(fs.readFileSync(VKEY_PATH));
            const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            
            res.json({
                success: true,
                pipeline: 'JOLT → Circuit → Groth16 → On-chain',
                input: circuitInput,
                proof: {
                    a: [proof.pi_a[0], proof.pi_a[1]],
                    b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
                    c: [proof.pi_c[0], proof.pi_c[1]]
                },
                publicSignals,
                verified,
                gasEstimate: '~300,000 gas for on-chain verification'
            });
        } else {
            res.json({
                success: false,
                message: 'Circuit not ready. Run setup_jolt_circuit.sh first',
                mockData: circuitInput
            });
        }
        
    } catch (error) {
        console.error('Test pipeline error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           JOLT to Circuit Bridge - EXPERIMENTAL             ║
║                                                              ║
║  Purpose: Convert JOLT zkML proofs to on-chain verifiable   ║
║  Status: Phase 1 - Testing (NOT in production workflow)     ║
║  Port: ${PORT}                                              ║
║                                                              ║
║  Circuit: ${circuitReady ? '✅ Ready' : '❌ Not setup - run setup_jolt_circuit.sh'}               ║
║                                                              ║
║  Endpoints:                                                  ║
║  - POST /convert/jolt-to-groth16                           ║
║  - POST /verify/groth16                                    ║
║  - POST /generate/calldata                                 ║
║  - POST /test/full-pipeline                                ║
║                                                              ║
║  Note: This is experimental and separate from main workflow ║
╚══════════════════════════════════════════════════════════════╝
    `);
    
    checkCircuitFiles();
});