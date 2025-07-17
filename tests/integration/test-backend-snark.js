const fetch = require('node-fetch');
const fs = require('fs');

async function testBackendSNARK() {
    console.log("=== Testing Backend SNARK Generation ===\n");
    
    // Use the existing proof that's timing out
    const proofId = 'proof_location_1752158296357';
    
    console.log(`Testing with proof ID: ${proofId}`);
    console.log("Fetching Ethereum proof data...");
    
    const startTime = Date.now();
    
    try {
        const response = await fetch(`http://localhost:8001/api/proof/${proofId}/ethereum`, {
            timeout: 60000 // 60 second timeout
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        
        const data = await response.json();
        const endTime = Date.now();
        
        console.log(`\n✅ SNARK generated successfully in ${(endTime - startTime) / 1000} seconds`);
        console.log("\nProof structure:");
        console.log("- a:", data.proof.a);
        console.log("- b:", data.proof.b);
        console.log("- c:", data.proof.c);
        console.log("\nPublic signals:", data.public_signals);
        console.log("\nProof ID bytes32:", data.proof_id_bytes32);
        
        // Save to file for manual verification
        fs.writeFileSync('test_proof_data.json', JSON.stringify(data, null, 2));
        console.log("\n✅ Proof data saved to test_proof_data.json");
        
        return data;
        
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        
        // Check if it's using fallback
        console.log("\nChecking server logs...");
        try {
            const logs = fs.readFileSync('rust_server.log', 'utf8');
            const recentLogs = logs.split('\n').slice(-20).join('\n');
            console.log("\nRecent server logs:");
            console.log(recentLogs);
        } catch (e) {
            console.log("Could not read server logs");
        }
    }
}

testBackendSNARK().catch(console.error);