#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('\n🔍 Workflow System Diagnostic\n');

const checks = [];

// Check 1: Required files exist
console.log('Checking required files...');
const requiredFiles = [
    'workflowManager.js',
    'workflowParser_generic_final.js',
    'workflowExecutor_generic.js',
    'workflowCLI_generic.js',
    'circleHandler.js'
];

requiredFiles.forEach(file => {
    const path = join(__dirname, file);
    const exists = existsSync(path);
    checks.push({
        name: `File: ${file}`,
        passed: exists,
        message: exists ? '✅ Found' : '❌ Missing'
    });
});

// Check 2: zkEngine binary
console.log('\nChecking zkEngine...');
const zkEnginePath = process.env.ZKENGINE_BINARY || join(__dirname, '..', 'zkengine_binary', 'zkengine');
const zkEngineExists = existsSync(zkEnginePath);
checks.push({
    name: 'zkEngine binary',
    passed: zkEngineExists,
    message: zkEngineExists ? `✅ Found at ${zkEnginePath}` : `❌ Not found at ${zkEnginePath}`
});

// Check 3: WASM files
console.log('\nChecking WASM files...');
const wasmDir = process.env.WASM_DIR || join(__dirname, '..', 'zkengine_binary');
const wasmFiles = [
    'kyc_compliance_real.wasm',
    'ai_content_verification_real.wasm',
    'depin_location_real.wasm'
];

wasmFiles.forEach(file => {
    const path = join(wasmDir, file);
    const exists = existsSync(path);
    checks.push({
        name: `WASM: ${file}`,
        passed: exists,
        message: exists ? '✅ Found' : '❌ Missing'
    });
});

// Check 4: Python service
console.log('\nChecking Python service...');
try {
    execSync('curl -s http://localhost:8002/context', { encoding: 'utf8', timeout: 2000 });
    checks.push({
        name: 'Python service',
        passed: true,
        message: '✅ Running on port 8002'
    });
} catch (e) {
    checks.push({
        name: 'Python service',
        passed: false,
        message: '❌ Not responding on port 8002'
    });
}

// Check 5: Test parser
console.log('\nTesting workflow parser...');
try {
    const parserPath = join(__dirname, 'workflowParser_generic_final.js');
    const output = execSync(`node "${parserPath}" "Generate KYC proof then send 0.01 to alice"`, { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    checks.push({
        name: 'Workflow parser',
        passed: parsed.steps && parsed.steps.length > 0,
        message: parsed.steps ? `✅ Working (parsed ${parsed.steps.length} steps)` : '❌ Failed to parse'
    });
} catch (e) {
    checks.push({
        name: 'Workflow parser',
        passed: false,
        message: `❌ Error: ${e.message}`
    });
}

// Check 6: Core Environment variables
console.log('\nChecking core environment variables...');
const coreEnvVars = ['OPENAI_API_KEY'];
coreEnvVars.forEach(varName => {
    const exists = process.env[varName] && process.env[varName] !== '';
    checks.push({
        name: `Env: ${varName}`,
        passed: exists,
        message: exists ? '✅ Set' : '❌ Not set (check .env file)'
    });
});

// Check 7: Circle Environment variables
console.log('\nChecking Circle configuration...');
const circleVars = {
    'CIRCLE_API_KEY': 'Circle API Key',
    'CIRCLE_ENVIRONMENT': 'Circle Environment (should be sandbox)',
    'CIRCLE_ETH_WALLET_ADDRESS': 'Circle ETH Wallet Address',
    'CIRCLE_SOL_WALLET_ADDRESS': 'Circle SOL Wallet Address', 
    'CIRCLE_ETH_WALLET_ID': 'Circle ETH Wallet ID',
    'CIRCLE_SOL_WALLET_ID': 'Circle SOL Wallet ID'
};

Object.entries(circleVars).forEach(([varName, description]) => {
    const value = process.env[varName];
    const exists = value && value !== '';
    
    let message = '';
    if (!exists) {
        message = `❌ Not set (${description})`;
    } else if (varName === 'CIRCLE_API_KEY') {
        message = value.startsWith('SAND_API_KEY:') ? '✅ Set (Sandbox)' : '✅ Set';
    } else if (varName === 'CIRCLE_ENVIRONMENT') {
        message = value === 'sandbox' ? '✅ sandbox' : `⚠️  ${value} (expected: sandbox)`;
    } else {
        message = `✅ ${value}`;
    }
    
    checks.push({
        name: `Circle: ${varName}`,
        passed: exists,
        message: message
    });
});

// Check 8: Network Configuration
console.log('\nChecking network configuration...');
const networkVars = {
    'ETH_NETWORK': { expected: 'sepolia', description: 'Ethereum Network' },
    'SOLANA_NETWORK': { expected: 'devnet', description: 'Solana Network' }
};

Object.entries(networkVars).forEach(([varName, config]) => {
    const value = process.env[varName];
    const exists = value && value !== '';
    const correct = value === config.expected;
    
    checks.push({
        name: `Network: ${varName}`,
        passed: exists && correct,
        message: !exists ? `❌ Not set (${config.description})` : 
                correct ? `✅ ${value}` : 
                `⚠️  ${value} (expected: ${config.expected})`
    });
});

// Summary
console.log('\n📊 Diagnostic Summary\n');
const passed = checks.filter(c => c.passed).length;
const failed = checks.filter(c => !c.passed).length;

console.log('='.repeat(60));
checks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}: ${check.message}`);
});
console.log('='.repeat(60));

console.log(`\nTotal: ${passed} passed, ${failed} failed\n`);

// Expected Circle configuration for reference
if (checks.some(c => c.name.startsWith('Circle:') && !c.passed)) {
    console.log('📋 Expected Circle Configuration:\n');
    console.log('Add these to your ~/agentkit/.env file:\n');
    console.log('CIRCLE_API_KEY=SAND_API_KEY:75fd8d4bcbc9ce76a2637b6908527ebe:6b65eb054620d280743e50e568cbfbf6');
    console.log('CIRCLE_ENVIRONMENT=sandbox');
    console.log('CIRCLE_ETH_WALLET_ADDRESS=0x37b6c846ca0483a0fc6c7702707372ebcd131188');
    console.log('CIRCLE_SOL_WALLET_ADDRESS=HsZdbBxZVNzEn4qR9Ebx5XxDSZ136Mu14VlH1nbXGhfG');
    console.log('CIRCLE_ETH_WALLET_ID=1017339334');
    console.log('CIRCLE_SOL_WALLET_ID=1017339334');
    console.log('ETH_NETWORK=sepolia');
    console.log('SOLANA_NETWORK=devnet\n');
}

if (failed > 0) {
    console.log('🔧 Fixes needed:\n');
    
    if (!zkEngineExists) {
        console.log('1. Ensure zkEngine binary is at:');
        console.log(`   ${zkEnginePath}\n`);
    }
    
    if (checks.find(c => c.name.includes('WASM') && !c.passed)) {
        console.log('2. Ensure WASM files are in:');
        console.log(`   ${wasmDir}\n`);
    }
    
    if (!checks.find(c => c.name === 'Python service').passed) {
        console.log('3. Start the Python service:');
        console.log('   cd ~/agentkit && python chat_service.py\n');
    }
    
    if (checks.find(c => (c.name.includes('Env:') || c.name.includes('Circle:')) && !c.passed)) {
        console.log('4. Add missing environment variables to ~/agentkit/.env file\n');
    }
} else {
    console.log('✨ All checks passed! The workflow system is ready for production.\n');
    console.log('🚀 Quick test commands:\n');
    console.log('  # With simulation:');
    console.log('  node workflowCLI_generic.js "Generate KYC proof then send 0.01 to alice"\n');
    console.log('  # With real zkEngine:');
    console.log('  node workflowCLI_generic.js "Generate KYC proof then send 0.01 to alice"\n');
}

process.exit(failed > 0 ? 1 : 0);
