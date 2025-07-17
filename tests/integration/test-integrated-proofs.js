const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testIntegratedProofs() {
    console.log("🧪 Testing Integrated Nova-to-Groth16 Conversion with Real Proofs");
    console.log("=".repeat(70));
    
    // Find existing proofs for each type
    const proofsDir = './proofs';
    const proofTypes = {
        kyc: [],
        location: [],
        ai_content: []
    };
    
    // Scan for existing proofs
    const dirs = fs.readdirSync(proofsDir);
    for (const dir of dirs) {
        if (dir.startsWith('proof_kyc_')) proofTypes.kyc.push(dir);
        else if (dir.startsWith('proof_location_')) proofTypes.location.push(dir);
        else if (dir.startsWith('proof_ai_content_')) proofTypes.ai_content.push(dir);
    }
    
    console.log("\n📁 Found existing proofs:");
    console.log(`   KYC: ${proofTypes.kyc.length} proofs`);
    console.log(`   Location: ${proofTypes.location.length} proofs`);
    console.log(`   AI Content: ${proofTypes.ai_content.length} proofs`);
    
    // Test one proof of each type
    const results = [];
    
    // Test KYC proof
    if (proofTypes.kyc.length > 0) {
        const proofId = proofTypes.kyc[0];
        console.log(`\n1️⃣ Testing KYC Proof: ${proofId}`);
        await testProof(proofId, 'KYC', results);
    }
    
    // Test Location proof
    if (proofTypes.location.length > 0) {
        const proofId = proofTypes.location[0];
        console.log(`\n2️⃣ Testing Location Proof: ${proofId}`);
        await testProof(proofId, 'Location', results);
    }
    
    // Test AI Content proof
    if (proofTypes.ai_content.length > 0) {
        const proofId = proofTypes.ai_content[0];
        console.log(`\n3️⃣ Testing AI Content Proof: ${proofId}`);
        await testProof(proofId, 'AI Content', results);
    }
    
    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(70));
    
    for (const result of results) {
        console.log(`\n${result.type} Proof (${result.proofId}):`);
        console.log(`   Current approach: ${result.current.success ? '✅' : '❌'} ${result.current.time}ms`);
        console.log(`   Integrated approach: ${result.integrated.success ? '✅' : '❌'} ${result.integrated.time}ms`);
        console.log(`   Proofs match: ${result.match ? '✅' : '❌'}`);
        
        if (result.integrated.success) {
            console.log(`   Public signals: ${result.integrated.signals}`);
            console.log(`   Proof size: ${result.integrated.size} bytes`);
        }
    }
}

async function testProof(proofId, type, results) {
    const result = {
        proofId,
        type,
        current: { success: false, time: 0 },
        integrated: { success: false, time: 0 },
        match: false
    };
    
    try {
        // Test current approach
        console.log("   Testing current approach...");
        const start1 = Date.now();
        const resp1 = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum`);
        result.current.time = Date.now() - start1;
        result.current.success = true;
        
        // Test integrated approach
        console.log("   Testing integrated approach...");
        const start2 = Date.now();
        const resp2 = await axios.get(`http://localhost:8001/api/proof/${proofId}/ethereum-integrated`);
        result.integrated.time = Date.now() - start2;
        result.integrated.success = true;
        result.integrated.signals = resp2.data.public_signals.length;
        result.integrated.size = JSON.stringify(resp2.data).length;
        
        // Compare proofs
        const proof1 = JSON.stringify(resp1.data.proof);
        const proof2 = JSON.stringify(resp2.data.proof);
        result.match = proof1 === proof2;
        
        console.log(`   ✅ Both approaches succeeded`);
        console.log(`   Times: Current ${result.current.time}ms, Integrated ${result.integrated.time}ms`);
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        if (error.response) {
            console.error(`   Details: ${JSON.stringify(error.response.data)}`);
        }
    }
    
    results.push(result);
}

// Run tests
testIntegratedProofs().catch(console.error);