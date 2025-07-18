#!/usr/bin/env node

const RealSNARKProver = require('./real_snark_prover');
const fs = require('fs');

async function main() {
    try {
        // Get input file from command line
        const inputFile = process.argv[2];
        if (!inputFile) {
            throw new Error("Usage: node cached_snark_generator.js <input.json>");
        }

        // Read input data
        const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        
        // Log for debugging (to stderr so it doesn't interfere with output)
        process.stderr.write("Input data: " + JSON.stringify(inputData, null, 2) + "\n");
        
        // Create prover instance
        const prover = new RealSNARKProver();
        
        // Generate the proof with timeout
        const TIMEOUT_MS = 60000; // 60 seconds timeout
        let timeoutHandle;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                process.stderr.write("SNARK generation timeout reached, exiting...\n");
                reject(new Error(`SNARK generation timed out after ${TIMEOUT_MS/1000} seconds`));
            }, TIMEOUT_MS);
        });
        
        const result = await Promise.race([
            prover.generateProof(inputData),
            timeoutPromise
        ]);
        
        // Clear the timeout since we succeeded
        clearTimeout(timeoutHandle);
        
        // Output the result as JSON to stdout (write to stdout, not console.log)
        process.stdout.write(JSON.stringify(result));
        
        // Explicitly exit with success
        process.exit(0);
        
    } catch (error) {
        process.stderr.write(JSON.stringify({
            error: error.message,
            stack: error.stack
        }));
        process.exit(1);
    }
}

main();