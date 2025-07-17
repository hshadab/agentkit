const snarkjs = require("snarkjs");
const path = require("path");

async function testSNARK() {
    console.log("=== Testing SNARK with existing zkey path ===");
    
    const wasmPath = path.join(__dirname, "build/ProofOfProof_js/ProofOfProof.wasm");
    const zkeyPath = path.join(__dirname, "build/proof_of_proof_final.zkey"); // lowercase version
    
    console.log("WASM:", wasmPath);
    console.log("ZKey:", zkeyPath);
    
    // Test input
    const input = {
        novaProofCommitment: "123",
        proofType: "1", 
        timestamp: "1000",
        verificationResult: "1",
        proofId: "456",
        executionResult: "789"
    };
    
    console.log("\nGenerating proof with lowercase zkey...");
    console.time("SNARK Generation");
    
    try {
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );
        
        console.timeEnd("SNARK Generation");
        console.log("\n✅ SUCCESS!");
        console.log("Public signals:", publicSignals);
        
    } catch (error) {
        console.timeEnd("SNARK Generation");
        console.error("\n❌ FAILED:", error.message);
    }
}

testSNARK();