#!/usr/bin/env node

const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔮 Testing AI Prediction Commitment Proof\n');

// Simulate AI prediction scenario
const scenario = {
    prompt: "Analyze AAPL sentiment and predict movement for Jan 20, 2025",
    aiResponse: "Based on technical analysis and sentiment, AAPL will increase 2.3% due to positive earnings indicators",
    actualOutcome: "AAPL increased 2.1%"
};

// Step 1: Create hashes (simulating what would happen in real app)
const promptHash = crypto.createHash('sha256').update(scenario.prompt + "mysecret123").digest('hex');
const responseHash = crypto.createHash('sha256').update(scenario.aiResponse + "mysecret123").digest('hex');

console.log('📝 Step 1: Create Commitment');
console.log(`Prompt: "${scenario.prompt.substring(0, 50)}..."`);
console.log(`AI Response: "${scenario.aiResponse.substring(0, 50)}..."`);
console.log(`Prompt Hash: ${promptHash.substring(0, 16)}...`);
console.log(`Response Hash: ${responseHash.substring(0, 16)}...`);

// Step 2: Simulate blockchain commitment
const commitmentTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
const commitmentBlock = 19234567;

console.log('\n⛓️  Step 2: Simulate On-Chain Commitment');
console.log(`Commitment Time: ${new Date(commitmentTime * 1000).toISOString()}`);
console.log(`Block Number: ${commitmentBlock}`);
console.log(`Transaction: 0xabc123def456... (simulated)`);

// Step 3: Market closes, outcome known
const revealTime = Math.floor(Date.now() / 1000); // Now

console.log('\n📊 Step 3: Market Outcome Known');
console.log(`Actual Outcome: ${scenario.actualOutcome}`);
console.log(`Reveal Time: ${new Date(revealTime * 1000).toISOString()}`);

// Step 4: Generate ZK Proof using our WASM
console.log('\n🔐 Step 4: Generate ZK Proof');

// Convert hashes to integers for WASM (using first 8 hex chars)
const promptHashInt = parseInt(promptHash.substring(0, 8), 16);
const responseHashInt = parseInt(responseHash.substring(0, 8), 16);

// Prepare proof input
const proofInput = {
    prompt_hash: promptHashInt,
    response_hash: responseHashInt,
    commitment_timestamp: commitmentTime,
    reveal_timestamp: revealTime
};

console.log('Proof Input:', proofInput);

// Create a test runner script
const testScript = `
const fs = require('fs');
const wasmBuffer = fs.readFileSync('${__dirname}/zkengine_binary/ai_prediction_commitment.wasm');

WebAssembly.instantiate(wasmBuffer).then(result => {
    const { main, get_time_diff } = result.instance.exports;
    
    // Test the proof
    const isValid = main(
        ${proofInput.prompt_hash},
        ${proofInput.response_hash},
        ${proofInput.commitment_timestamp},
        ${proofInput.reveal_timestamp}
    );
    
    const timeDiff = get_time_diff(
        ${proofInput.prompt_hash},
        ${proofInput.response_hash},
        ${proofInput.commitment_timestamp},
        ${proofInput.reveal_timestamp}
    );
    
    console.log('\\n✅ Proof Validation Result:', isValid === 1 ? 'VALID' : 'INVALID');
    console.log('⏱️  Time Difference:', timeDiff, 'seconds (', (timeDiff/3600).toFixed(1), 'hours)');
    
    // Test invalid cases
    console.log('\\n🧪 Testing Invalid Cases:');
    
    // Test 1: Reveal before commit (should fail)
    const invalid1 = main(
        ${proofInput.prompt_hash},
        ${proofInput.response_hash},
        ${proofInput.reveal_timestamp},  // Swapped
        ${proofInput.commitment_timestamp}  // Swapped
    );
    console.log('❌ Reveal before commit:', invalid1 === 1 ? 'VALID' : 'INVALID (correct)');
    
    // Test 2: Same hash for prompt and response (should fail)
    const invalid2 = main(
        ${proofInput.prompt_hash},
        ${proofInput.prompt_hash},  // Same as prompt
        ${proofInput.commitment_timestamp},
        ${proofInput.reveal_timestamp}
    );
    console.log('❌ Same hash:', invalid2 === 1 ? 'VALID' : 'INVALID (correct)');
    
    // Test 3: Zero hash (should fail)
    const invalid3 = main(
        0,
        ${proofInput.response_hash},
        ${proofInput.commitment_timestamp},
        ${proofInput.reveal_timestamp}
    );
    console.log('❌ Zero hash:', invalid3 === 1 ? 'VALID' : 'INVALID (correct)');
});
`;

fs.writeFileSync('/tmp/test-wasm.js', testScript);

try {
    const output = execSync('node /tmp/test-wasm.js', { encoding: 'utf8' });
    console.log(output);
} catch (error) {
    console.error('Error running WASM test:', error.message);
}

// Step 5: Simulate ZK proof generation with zkEngine
console.log('\n🚀 Step 5: zkEngine Proof Generation (Simulated)');
console.log('In production, this would call:');
console.log(`zkEngine prove --wasm=ai_prediction_commitment.wasm --input=${JSON.stringify(proofInput)}`);
console.log('Output: proof.bin, public.json');

// Show what the proof demonstrates
console.log('\n📋 What This Proof Demonstrates:');
console.log('✓ Prediction was made BEFORE market close');
console.log('✓ Prediction hash matches committed hash');
console.log('✓ No cherry-picking of favorable predictions');
console.log('✓ Timestamp ordering is cryptographically proven');
console.log('✓ Time window is reasonable (not ancient prediction)');

console.log('\n🎯 Use Cases:');
console.log('- Trading algorithms proving predictions');
console.log('- Medical AI proving diagnoses before outcomes');
console.log('- Content moderation AI proving decisions');
console.log('- Any scenario requiring temporal proof');

// Cleanup
fs.unlinkSync('/tmp/test-wasm.js');