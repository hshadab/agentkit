#!/usr/bin/env node

/**
 * Test Script to Verify All Configurations
 * This script checks that all API keys, contracts, and services are properly configured
 */

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const { config, validateConfig } = require('./config');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, type = 'info') {
    const color = type === 'success' ? colors.green : 
                  type === 'error' ? colors.red : 
                  type === 'warning' ? colors.yellow : colors.blue;
    console.log(`${color}${message}${colors.reset}`);
}

async function checkFileExists(filePath, description) {
    try {
        const exists = fs.existsSync(filePath);
        if (exists) {
            log(`✓ ${description}: ${filePath}`, 'success');
            return true;
        } else {
            log(`✗ ${description}: ${filePath} NOT FOUND`, 'error');
            return false;
        }
    } catch (error) {
        log(`✗ ${description}: ${error.message}`, 'error');
        return false;
    }
}

async function checkEnvVariables() {
    log('\n=== Checking Environment Variables ===', 'info');
    
    const required = [
        { key: 'OPENAI_API_KEY', masked: true },
        { key: 'CIRCLE_API_KEY', masked: true },
        { key: 'CIRCLE_ETH_WALLET_ID', masked: false },
        { key: 'CIRCLE_SOL_WALLET_ID', masked: false },
        { key: 'PRIVATE_KEY', masked: true }
    ];
    
    let allPresent = true;
    
    for (const { key, masked } of required) {
        const value = process.env[key];
        if (value) {
            const display = masked ? `${value.substring(0, 10)}...` : value;
            log(`✓ ${key}: ${display}`, 'success');
        } else {
            log(`✗ ${key}: NOT SET`, 'error');
            allPresent = false;
        }
    }
    
    return allPresent;
}

async function checkContractDeployments() {
    log('\n=== Checking Smart Contract Deployments ===', 'info');
    
    const contracts = [
        {
            name: 'Ethereum Sepolia ZK Verifier',
            address: config.blockchain.ethereum.contractAddress,
            rpc: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
        },
        {
            name: 'Base Sepolia ZK Verifier',
            address: config.blockchain.base.contracts.zkVerifier,
            rpc: config.blockchain.base.rpcUrl
        },
        {
            name: 'Base Sepolia AI Prediction',
            address: config.blockchain.base.contracts.aiPredictionCommitment,
            rpc: config.blockchain.base.rpcUrl
        }
    ];
    
    for (const contract of contracts) {
        try {
            const web3 = new Web3(contract.rpc);
            const code = await web3.eth.getCode(contract.address);
            
            if (code && code !== '0x') {
                log(`✓ ${contract.name}: ${contract.address}`, 'success');
            } else {
                log(`✗ ${contract.name}: No code at ${contract.address}`, 'error');
            }
        } catch (error) {
            log(`✗ ${contract.name}: Failed to check - ${error.message}`, 'error');
        }
    }
}

async function checkWASMFiles() {
    log('\n=== Checking WASM Files ===', 'info');
    
    const wasmFiles = [
        { file: config.zkengine.proofTypes.kyc, description: 'KYC Compliance WASM' },
        { file: config.zkengine.proofTypes.location, description: 'Location Proof WASM' },
        { file: config.zkengine.proofTypes.ai_content, description: 'AI Prediction WASM' }
    ];
    
    for (const { file, description } of wasmFiles) {
        const fullPath = path.join(config.zkengine.wasmDir, file);
        await checkFileExists(fullPath, description);
    }
}

async function checkCircleConfig() {
    log('\n=== Checking Circle Configuration ===', 'info');
    
    if (config.circle.apiKey) {
        log(`✓ Circle API Key: ${config.circle.apiKey.substring(0, 20)}...`, 'success');
    } else {
        log('✗ Circle API Key: NOT SET', 'error');
    }
    
    log(`✓ Circle API URL: ${config.circle.apiUrl}`, 'success');
    log(`✓ Circle Developer Wallet ID: ${config.circle.developerWallet.walletId}`, 'success');
    log(`✓ Circle Developer Wallet Address: ${config.circle.developerWallet.address}`, 'success');
    log(`✓ Circle Entity Secret: ${config.circle.entitySecret.substring(0, 20)}...`, 'success');
}

async function checkFeatureFlags() {
    log('\n=== Checking Feature Flags ===', 'info');
    
    const features = config.features;
    for (const [feature, enabled] of Object.entries(features)) {
        const status = enabled ? '✓ ENABLED' : '✗ DISABLED';
        const color = enabled ? 'success' : 'warning';
        log(`${status}: ${feature}`, color);
    }
}

async function checkServices() {
    log('\n=== Checking Service Endpoints ===', 'info');
    
    // Check if services are reachable
    const services = [
        { name: 'Main Server', url: `http://localhost:${config.server.port}` },
        { name: 'Chat Service', url: config.ai.chatServiceUrl }
    ];
    
    for (const service of services) {
        try {
            const http = require('http');
            const url = new URL(service.url);
            
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: '/',
                method: 'GET',
                timeout: 2000
            };
            
            const isReachable = await new Promise((resolve) => {
                const req = http.request(options, (res) => {
                    resolve(res.statusCode < 500);
                });
                
                req.on('error', () => resolve(false));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });
                
                req.end();
            });
            
            if (isReachable) {
                log(`✓ ${service.name}: ${service.url} (reachable)`, 'success');
            } else {
                log(`⚠ ${service.name}: ${service.url} (not running)`, 'warning');
            }
        } catch (error) {
            log(`⚠ ${service.name}: ${service.url} (not running)`, 'warning');
        }
    }
}

async function generateSummary() {
    log('\n=== Configuration Summary ===', 'info');
    
    log('\nContract Addresses:', 'info');
    log(`  Ethereum Sepolia: ${config.blockchain.ethereum.contractAddress}`, 'info');
    log(`  Solana Devnet: ${config.blockchain.solana.programId}`, 'info');
    log(`  Base Sepolia ZK: ${config.blockchain.base.contracts.zkVerifier}`, 'info');
    log(`  Base Sepolia AI: ${config.blockchain.base.contracts.aiPredictionCommitment}`, 'info');
    
    log('\nExplorer Links:', 'info');
    log(`  Ethereum: ${config.blockchain.ethereum.explorerUrl}/address/${config.blockchain.ethereum.contractAddress}`, 'info');
    log(`  Base ZK: ${config.blockchain.base.explorerUrl}/address/${config.blockchain.base.contracts.zkVerifier}`, 'info');
    log(`  Base AI: ${config.blockchain.base.explorerUrl}/address/${config.blockchain.base.contracts.aiPredictionCommitment}`, 'info');
}

async function main() {
    log('🔍 Verifiable Agent Kit Configuration Test\n', 'info');
    
    // Run all checks
    await checkEnvVariables();
    await checkContractDeployments();
    await checkWASMFiles();
    await checkCircleConfig();
    await checkFeatureFlags();
    await checkServices();
    await generateSummary();
    
    // Validate using built-in validator
    log('\n=== Running Built-in Config Validation ===', 'info');
    const isValid = validateConfig();
    
    if (isValid) {
        log('\n✅ All required configurations are present!', 'success');
    } else {
        log('\n❌ Some configurations are missing. Check the warnings above.', 'error');
    }
}

// Run the test
main().catch(console.error);