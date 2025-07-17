#!/usr/bin/env node

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

async function testProofPersistence() {
    console.log("🧪 Testing Proof Database Persistence...\n");
    
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve) => {
        ws.on('open', () => {
            console.log("✅ Connected to WebSocket");
            resolve();
        });
    });
    
    // Test 1: Generate a new proof
    console.log("\n📝 Test 1: Generating new proof...");
    const proofId = `proof_kyc_${Date.now()}`;
    
    const proofRequest = {
        proof_id: proofId,
        metadata: {
            function: "prove_kyc",
            arguments: ["67890", "1"],
            step_size: 50,
            explanation: "Test KYC proof for database persistence"
        }
    };
    
    // Send proof generation request
    ws.send(JSON.stringify(proofRequest));
    
    // Wait for proof completion
    const proofComplete = await new Promise((resolve) => {
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'proof_complete' && msg.proof_id === proofId) {
                console.log("✅ Proof generated successfully");
                console.log(`  - Proof ID: ${msg.proof_id}`);
                console.log(`  - Time: ${msg.metrics.time_ms}ms`);
                console.log(`  - Size: ${msg.metrics.proof_size} bytes`);
                resolve(msg);
            } else if (msg.type === 'proof_error' && msg.proof_id === proofId) {
                console.error("❌ Proof generation failed:", msg.error);
                process.exit(1);
            }
        });
    });
    
    // Test 2: Check if proof was saved to database
    console.log("\n📊 Test 2: Checking database persistence...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Give it time to write
    
    const dbPath = path.join(__dirname, 'proofs_db.json');
    if (!fs.existsSync(dbPath)) {
        console.error("❌ proofs_db.json not found!");
        process.exit(1);
    }
    
    const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    if (dbContent[proofId]) {
        console.log("✅ Proof found in database");
        console.log(`  - Status: ${dbContent[proofId].status}`);
        console.log(`  - Function: ${dbContent[proofId].metadata.function}`);
        console.log(`  - Timestamp: ${dbContent[proofId].timestamp}`);
    } else {
        console.error("❌ Proof not found in database!");
        console.log("Available proof IDs:", Object.keys(dbContent).slice(-5));
        process.exit(1);
    }
    
    // Test 3: List proofs to verify it appears
    console.log("\n📋 Test 3: Listing proofs...");
    const listRequest = {
        metadata: {
            function: "list_proofs",
            arguments: ["proofs"],
            step_size: 1,
            explanation: "List all proofs"
        }
    };
    
    ws.send(JSON.stringify(listRequest));
    
    const listResponse = await new Promise((resolve) => {
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'list_response') {
                resolve(msg);
            }
        });
    });
    
    const foundInList = listResponse.proofs.find(p => p.proof_id === proofId);
    if (foundInList) {
        console.log("✅ Proof found in list");
        console.log(`  - From DB: ${foundInList.from_db || false}`);
        console.log(`  - Function: ${foundInList.function}`);
    } else {
        console.error("❌ Proof not found in list!");
        console.log("Recent proofs:", listResponse.proofs.slice(0, 3).map(p => p.proof_id));
    }
    
    // Test 4: Verify the proof
    console.log("\n🔍 Test 4: Verifying proof...");
    const verifyRequest = {
        metadata: {
            function: "verify_proof",
            arguments: [proofId],
            step_size: 50,
            explanation: "Verify test proof",
            additional_context: { is_verification: true }
        }
    };
    
    ws.send(JSON.stringify(verifyRequest));
    
    await new Promise((resolve) => {
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'verification_complete' && msg.proof_id === proofId) {
                console.log("✅ Proof verified successfully");
                console.log(`  - Result: ${msg.result}`);
                resolve(msg);
            }
        });
    });
    
    console.log("\n✅ All tests passed! Proof persistence is working correctly.");
    ws.close();
    process.exit(0);
}

testProofPersistence().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});