#!/usr/bin/env node

const RealSNARKProver = require('./real_snark_prover');
const fs = require('fs');

async function main() {
    try {
        // Get input file from command line
        const inputFile = process.argv[2];
        if (!inputFile) {
            throw new Error("Usage: node generate_snark_proof.js <input.json>");
        }

        // Read input data
        const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        
        // Log for debugging (to stderr so it doesn't interfere with output)
        process.stderr.write("Input data: " + JSON.stringify(inputData, null, 2) + "\n");
        
        // Create prover instance
        const prover = new RealSNARKProver();
        
        // Generate the proof with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SNARK generation timed out after 180 seconds')), 180000)
        );
        
        const result = await Promise.race([
            prover.generateProof(inputData),
            timeoutPromise
        ]);
        
        // Output the result as JSON to stdout (write to stdout, not console.log)
        process.stdout.write(JSON.stringify(result));
        
    } catch (error) {
        process.stderr.write(JSON.stringify({
            error: error.message,
            stack: error.stack
        }));
        process.exit(1);
    }
}

main();