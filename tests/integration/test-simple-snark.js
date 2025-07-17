const RealSNARKProver = require('./src/real_snark_prover');

async function testSimpleSNARK() {
    console.log("=== Testing Simple SNARK Generation ===\n");
    
    const prover = new RealSNARKProver();
    
    // Create simple test input
    const testInput = {
        proofId: "test_simple_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["user123", "25"]
        },
        publicInputs: {},
        commitment: "0x1234567890abcdef"
    };
    
    console.log("Testing with simple input...");
    const startTime = Date.now();
    
    try {
        const result = await prover.generateProof(testInput);
        const endTime = Date.now();
        
        console.log(`\n✅ SNARK generated successfully in ${(endTime - startTime) / 1000} seconds`);
        console.log("\nProof:");
        console.log(JSON.stringify(result.proof, null, 2));
        console.log("\nPublic signals:", result.publicSignals);
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
}

testSimpleSNARK().catch(console.error);