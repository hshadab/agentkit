const snarkjs = require("snarkjs");
const fs = require("fs");

async function test() {
    try {
        console.log("Testing SNARK generation...");
        
        const input = {
            novaProofCommitment: "12345",
            proofType: "1",
            timestamp: Math.floor(Date.now() / 1000),
            verificationResult: 1,
            proofId: "67890",
            executionResult: "11111"
        };
        
        console.log("Input:", input);
        console.log("WASM path:", "build/ProofOfProof_js/ProofOfProof.wasm");
        console.log("zkey path:", "build/proof_of_proof_final.zkey");
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            "build/ProofOfProof_js/ProofOfProof.wasm",
            "build/proof_of_proof_final.zkey"
        );
        
        console.log("Success! Proof:", proof);
        console.log("Public signals:", publicSignals);
        
    } catch (error) {
        console.error("Error:", error);
    }
}

test();