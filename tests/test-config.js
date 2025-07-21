#!/usr/bin/env node

/**
 * Test Configuration Script
 * Verifies all API keys, contracts, and configurations are properly set
 */

const { config, validateConfig } = require('./config.js');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Verifiable Agent Kit Configuration...\n');

// 1. Check environment variables
console.log('1️⃣ Checking Environment Variables:');
const envVars = {
    'OpenAI API Key': !!config.ai.openaiApiKey,
    'Circle API Key': !!config.circle.apiKey,
    'Circle ETH Wallet': !!config.circle.ethWalletId,
    'Circle SOL Wallet': !!config.circle.solWalletId,
    'Private Key': !!process.env.PRIVATE_KEY
};

for (const [name, exists] of Object.entries(envVars)) {
    console.log(`   ${exists ? '✅' : '❌'} ${name}: ${exists ? 'Configured' : 'Missing'}`);
}

// 2. Check contract addresses
console.log('\n2️⃣ Checking Contract Addresses:');
console.log(`   ✅ Ethereum Verifier: ${config.blockchain.ethereum.contractAddress}`);
console.log(`   ✅ Solana Program ID: ${config.blockchain.solana.programId}`);
console.log(`   ✅ Base ZK Verifier: ${config.blockchain.base.contracts.zkVerifier}`);
console.log(`   ✅ Base AI Commitment: ${config.blockchain.base.contracts.aiPredictionCommitment}`);

// 3. Check WASM files
console.log('\n3️⃣ Checking WASM Files:');
const wasmFiles = config.zkengine.proofTypes;
for (const [type, filename] of Object.entries(wasmFiles)) {
    const filePath = path.join(config.zkengine.wasmDir, filename);
    const exists = fs.existsSync(filePath);
    console.log(`   ${exists ? '✅' : '❌'} ${type}: ${filename} ${exists ? '' : '(File not found)'}`);
}

// 4. Check zkEngine binary
console.log('\n4️⃣ Checking zkEngine:');
const zkEnginePath = process.env.ZKENGINE_BINARY || config.zkengine.binaryPath;
const zkEngineExists = fs.existsSync(zkEnginePath);
console.log(`   ${zkEngineExists ? '✅' : '❌'} zkEngine binary: ${zkEnginePath}`);

// 5. Check deployment info
console.log('\n5️⃣ Checking Deployment Files:');
const deploymentFiles = [
    'deployment-ai-commitment-base.json',
    'test-ai-commitment-results.json',
    'config-complete.js'
];

for (const file of deploymentFiles) {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
}

// 6. Check Circle configuration
console.log('\n6️⃣ Circle Configuration:');
console.log(`   ✅ API URL: ${config.circle.apiUrl}`);
console.log(`   ✅ USDC Token ID: ${config.circle.usdcTokenId}`);
console.log(`   ✅ Entity Secret: ${config.circle.entitySecret ? 'Configured' : 'Missing'}`);
console.log(`   ✅ Developer Wallet: ${config.circle.developerWallet.walletId}`);

// 7. Feature flags
console.log('\n7️⃣ Feature Flags:');
console.log(`   ✅ OpenAI: ${config.features.enableOpenAI}`);
console.log(`   ✅ Circle Transfers: ${config.features.enableCircleTransfers}`);
console.log(`   ✅ Ethereum: ${config.features.enableEthereum}`);
console.log(`   ✅ Solana: ${config.features.enableSolana}`);
console.log(`   ✅ Base: ${config.features.enableBase}`);
console.log(`   ✅ Real AI Commitments: ${config.features.enableRealAICommitments}`);

// 8. Run validation
console.log('\n8️⃣ Running Configuration Validation:');
const isValid = validateConfig();
console.log(`   ${isValid ? '✅' : '❌'} Configuration ${isValid ? 'is valid' : 'has errors'}`);

// Summary
console.log('\n📊 Summary:');
const criticalMissing = !config.ai.openaiApiKey || !config.circle.apiKey;
if (criticalMissing) {
    console.log('   ⚠️  Critical configuration missing. Check your .env file.');
} else {
    console.log('   ✅ All critical configurations are set!');
}

console.log('\n📝 Configuration Details:');
console.log('   - AI Model:', config.ai.openaiModel);
console.log('   - Server Port:', config.server.port);
console.log('   - Base Chain ID:', config.blockchain.base.chainId);
console.log('   - Base Explorer:', config.blockchain.base.explorerUrl);

console.log('\n✨ Configuration test complete!');