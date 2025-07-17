#!/usr/bin/env node

// Simple test to isolate SNARK generation issue

async function test() {
    console.error('[TEST] Starting simple SNARK test...');
    
    try {
        console.error('[TEST] Loading snarkjs...');
        const snarkjs = require("snarkjs");
        console.error('[TEST] snarkjs loaded');
        
        // Create minimal input
        const input = {
            novaProofCommitment: "1",
            proofType: "1", 
            timestamp: "1234567890",
            userAddress: "1",
            novaProofHash: "1",
            executionStepCount: "1",
            finalStateHash: "1",
            verificationSeed: "1",
            kycData: "1",
            locationData: "0",
            aiContentHash: "0"
        };
        
        const wasmPath = "/home/hshadab/agentkit/build/RealProofOfProof_js/RealProofOfProof_js/RealProofOfProof.wasm";
        const zkeyPath = "/home/hshadab/agentkit/build/real_proof_of_proof_final.zkey";
        
        console.error('[TEST] Starting fullProve...');
        const startTime = Date.now();
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );
        
        console.error(`[TEST] fullProve completed in ${Date.now() - startTime}ms`);
        console.log(JSON.stringify({ success: true, proof, publicSignals }));
        
    } catch (error) {
        console.error('[TEST] Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

test();