#!/usr/bin/env node

const SimplifiedSNARKProver = require('./src/simplified_snark_prover');
const fs = require('fs');

async function test() {
    try {
        // Read the real Nova proof data
        const inputData = JSON.parse(fs.readFileSync('/home/hshadab/agentkit/proofs/proof_kyc_1752367646470/snark_input.json', 'utf8'));
        
        console.log("Testing simplified SNARK generation...");
        console.log("Input proof ID:", inputData.proofId);
        
        const prover = new SimplifiedSNARKProver();
        const startTime = Date.now();
        
        const result = await prover.generateProof(inputData);
        
        const elapsed = Date.now() - startTime;
        console.log(`\nSNARK generation completed in ${elapsed/1000} seconds`);
        console.log("Result:", JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

test();