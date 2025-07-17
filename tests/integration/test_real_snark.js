const snarkjs = require("snarkjs");
const path = require("path");

async function testRealSNARK() {
    console.log("=== Testing Real SNARK with Proper ZKey ===");
    
    const wasmPath = path.join(__dirname, "build/ProofOfProof_js/ProofOfProof.wasm");
    const zkeyPath = path.join(__dirname, "build/ProofOfProof_final.zkey");
    
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
    
    console.log("\nGenerating proof...");
    console.time("SNARK Generation");
    
    try {
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            wasmPath,
            zkeyPath
        );
        
        console.timeEnd("SNARK Generation");
        console.log("\n✅ SUCCESS! Real SNARK generated!");
        console.log("Public signals:", publicSignals);
        console.log("Proof a:", proof.pi_a.slice(0, 2));
        
        // Verify the proof
        console.log("\nVerifying proof...");
        const vKey = JSON.parse(
            require("fs").readFileSync(path.join(__dirname, "build/verification_key.json"))
        );
        
        const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        console.log("Proof is valid:", isValid);
        
    } catch (error) {
        console.timeEnd("SNARK Generation");
        console.error("\n❌ FAILED:", error.message);
        console.error("Stack:", error.stack);
    }
}

testRealSNARK();