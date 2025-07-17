const snarkjs = require("snarkjs");
const path = require("path");

async function testSNARKTiming() {
    console.log("Testing SNARK generation timing...");
    
    const wasmPath = path.join(__dirname, "build/ProofOfProof_js/ProofOfProof.wasm");
    const zkeyPath = path.join(__dirname, "build/proof_of_proof_final.zkey");
    
    // Simple input
    const input = {
        novaProofCommitment: "123",
        proofType: "1",
        timestamp: "1000",
        verificationResult: "1",
        proofId: "456",
        executionResult: "789"
    };
    
    console.log("Starting SNARK generation at:", new Date().toISOString());
    console.time("SNARK Generation");
    
    try {
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );
        
        console.timeEnd("SNARK Generation");
        console.log("Success\! Generated at:", new Date().toISOString());
        console.log("Public signals:", publicSignals.slice(0, 3), "...");
        
    } catch (error) {
        console.timeEnd("SNARK Generation");
        console.error("Failed:", error.message);
    }
}

testSNARKTiming().catch(console.error);
EOF < /dev/null
