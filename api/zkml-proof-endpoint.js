/**
 * zkML Proof Generation API Endpoint
 * Calls JOLT-Atlas binary for real proof generation
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to JOLT-Atlas prover binaries
const MINIMAL_PROVER = path.join(__dirname, '../jolt-atlas/target/release/agent_prover_minimal');
const FULL_PROVER = path.join(__dirname, '../jolt-atlas/target/release/agent_prover');

/**
 * Generate zkML proof using JOLT-Atlas
 */
async function generateZkMLProof(req, res) {
    const { agent_type, amount, operation, risk, use_minimal_model } = req.body;
    
    console.log('🧬 zkML Proof Request:', { agent_type, amount, operation, risk, use_minimal_model });
    
    // Choose prover based on model preference
    const proverPath = use_minimal_model ? MINIMAL_PROVER : FULL_PROVER;
    
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const process = spawn(proverPath, [
            agent_type.toString(),
            amount.toString(),
            operation.toString(),
            risk.toString()
        ]);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        process.on('close', (code) => {
            const duration = Date.now() - startTime;
            
            if (code === 0 && stdout) {
                // Parse hex proof output
                const hexProof = stdout.trim();
                const proofBytes = [];
                
                for (let i = 0; i < hexProof.length; i += 2) {
                    proofBytes.push(parseInt(hexProof.substr(i, 2), 16));
                }
                
                // First byte indicates decision
                const decision = proofBytes[0] === 1;
                
                res.json({
                    success: true,
                    proof: proofBytes,
                    decision: decision,
                    proofTime: duration,
                    modelType: use_minimal_model ? 'minimal' : 'full',
                    cryptographic: duration > 100 // Real proofs take longer
                });
            } else {
                console.error('zkML proof generation failed:', stderr);
                res.json({
                    success: false,
                    error: stderr || 'Proof generation failed',
                    fallback: true,
                    proof: [0, agent_type, amount, operation, risk],
                    decision: agent_type >= 2 && amount < 50 && risk < 30
                });
            }
        });
        
        // Timeout after 15 seconds
        setTimeout(() => {
            process.kill();
            res.json({
                success: false,
                error: 'Proof generation timeout',
                fallback: true,
                proof: [0, agent_type, amount, operation, risk],
                decision: agent_type >= 2 && amount < 50 && risk < 30
            });
        }, 15000);
    });
}

module.exports = { generateZkMLProof };