#!/usr/bin/env node

const RealSNARKProver = require('./src/real_snark_prover');

async function main() {
    try {
        console.error("Starting SNARK test from simulated Rust call...");
        
        // Simulate the input that would come from Rust
        const inputData = {
            "proofId": "proof_kyc_1752177334963",
            "metadata": {
                "function": "prove_kyc",
                "arguments": ["12345", "1"]
            },
            "publicInputs": ["12345", "1"],
            "commitment": "0x1234567890abcdef"
        };
        
        console.error("Creating prover instance...");
        const prover = new RealSNARKProver();
        
        console.error("Generating proof...");
        const startTime = Date.now();
        
        const result = await prover.generateProof(inputData);
        
        const duration = Date.now() - startTime;
        console.error(`Proof generated in ${duration}ms`);
        console.error("Result:", JSON.stringify(result, null, 2));
        
        // Output result to stdout
        process.stdout.write(JSON.stringify(result));
        
    } catch (error) {
        console.error("Error:", error.message);
        console.error("Stack:", error.stack);
        process.exit(1);
    }
}

main();