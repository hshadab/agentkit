const snarkjs = require("snarkjs");
const fs = require("fs");

async function testLocalVerification() {
    console.log("=== Testing Local Proof Verification ===\\n");
    
    try {
        // Load the proof
        const proofPath = "/home/hshadab/agentkit/cache/kyc_test_1752374837774/snark_proof.json";
        const proofData = JSON.parse(fs.readFileSync(proofPath, "utf8"));
        
        // Load verification key
        const vKey = JSON.parse(fs.readFileSync("build/real_verification_key.json", "utf8"));
        
        console.log("Proof details:");
        console.log("- Commitment:", proofData.publicSignals[0]);
        console.log("- Is Valid Signal:", proofData.publicSignals[1]);
        console.log("- Proof Type:", proofData.publicSignals[3], "(1 = KYC)");
        
        // Convert proof format for snarkjs
        const proof = {
            pi_a: [proofData.proof.a[0], proofData.proof.a[1], "1"],
            pi_b: [[proofData.proof.b[0][1], proofData.proof.b[0][0]], 
                   [proofData.proof.b[1][1], proofData.proof.b[1][0]],
                   ["1", "0"]],
            pi_c: [proofData.proof.c[0], proofData.proof.c[1], "1"],
            protocol: "groth16"
        };
        
        console.log("\\nVerifying proof locally...");
        const res = await snarkjs.groth16.verify(vKey, proofData.publicSignals, proof);
        
        console.log("Local verification result:", res ? "✓ VALID" : "✗ INVALID");
        
        if (res) {
            console.log("\\n✅ The KYC proof is cryptographically valid\!");
            console.log("This proof can be verified on-chain with the same result.");
        } else {
            console.log("\\n❌ The proof is invalid.");
        }
        
    } catch (error) {
        console.error("Verification error:", error.message);
    }
}

testLocalVerification().catch(console.error);
