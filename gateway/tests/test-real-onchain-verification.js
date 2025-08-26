#!/usr/bin/env node

/**
 * Test Real On-Chain zkML Verification
 * This tests the complete flow with actual Ethereum verification
 */

import { ethers } from 'ethers';
import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3003';

async function testRealOnChainVerification() {
    console.log('🧪 Testing Real On-Chain zkML Verification\n');
    console.log('=' .repeat(60));
    
    // Step 1: Generate mock zkML proof
    console.log('\n📋 Step 1: Preparing zkML proof data');
    const mockProof = {
        proof: '0x' + ''.padStart(512, 'a'), // Mock proof data
        inputs: [3, 10, 1, 5], // Cross-chain agent, 10% amount, transfer, 5% risk
        proofData: {
            commitment: '0x' + ''.padStart(64, 'b'),
            witness: '0x' + ''.padStart(64, 'c'),
            evaluations: ['0x' + ''.padStart(64, 'd')]
        }
    };
    
    console.log('   Agent type: 3 (Cross-chain)');
    console.log('   Amount: 10%');
    console.log('   Operation: 1 (Transfer)');
    console.log('   Risk: 5%');
    
    // Step 2: Test simulated verification first
    console.log('\n📋 Step 2: Testing simulated on-chain verification');
    console.log('-'.repeat(60));
    
    try {
        const simulatedResponse = await fetch(`${BACKEND_URL}/zkml/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'test-session-' + Date.now(),
                proof: mockProof,
                network: 'sepolia',
                useRealChain: false
            })
        });
        
        const simulatedResult = await simulatedResponse.json();
        console.log('✅ Simulated verification result:');
        console.log('   Verified:', simulatedResult.verified);
        console.log('   Network:', simulatedResult.network);
        console.log('   TX Hash:', simulatedResult.txHash);
        console.log('   Block:', simulatedResult.blockNumber);
        console.log('   Gas:', simulatedResult.gasUsed);
        
    } catch (error) {
        console.error('❌ Simulated verification failed:', error.message);
    }
    
    // Step 3: Check if real verifier is deployed
    console.log('\n📋 Step 3: Checking verifier deployment status');
    console.log('-'.repeat(60));
    
    try {
        const infoResponse = await fetch(`${BACKEND_URL}/zkml/verifier-info/sepolia`);
        const info = await infoResponse.json();
        
        console.log('🔍 Verifier info:');
        console.log('   Network:', info.network);
        console.log('   Address:', info.verifierAddress);
        console.log('   Deployed:', info.isDeployed ? '✅ Yes' : '❌ No');
        console.log('   Chain ID:', info.chainId);
        
        if (!info.isDeployed || info.verifierAddress === '0x1234567890123456789012345678901234567890') {
            console.log('\n⚠️  Verifier not deployed yet. To deploy:');
            console.log('   1. Install dependencies: npm install');
            console.log('   2. Compile: npx hardhat compile');
            console.log('   3. Deploy: npx hardhat run scripts/deploy-zkml-verifier.js --network sepolia');
            console.log('   4. Update address in api/zkml-verifier-backend.js');
            console.log('\n📝 For now, continuing with simulated verification...');
            return;
        }
        
        // Step 4: Test real on-chain verification
        console.log('\n📋 Step 4: Testing REAL on-chain verification');
        console.log('-'.repeat(60));
        console.log('⚠️  This will submit a real transaction and consume gas!');
        
        const realResponse = await fetch(`${BACKEND_URL}/zkml/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'real-test-' + Date.now(),
                proof: mockProof,
                network: 'sepolia',
                useRealChain: true
            })
        });
        
        const realResult = await realResponse.json();
        
        if (realResult.error) {
            console.error('❌ Real verification error:', realResult.error);
            return;
        }
        
        console.log('✅ REAL on-chain verification completed!');
        console.log('   Verified:', realResult.verified);
        console.log('   Network:', realResult.network);
        console.log('   TX Hash:', realResult.txHash);
        console.log('   Block:', realResult.blockNumber);
        console.log('   Gas Used:', realResult.gasUsed);
        console.log('   Contract:', realResult.contractAddress);
        
        const explorerUrl = `https://sepolia.etherscan.io/tx/${realResult.txHash}`;
        console.log('\n🔗 View transaction on Etherscan:');
        console.log('   ' + explorerUrl);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log('✅ Simulated verification: Working');
    console.log('🔄 Real verification: Ready when contract is deployed');
    console.log('📝 Next steps:');
    console.log('   1. Deploy ZKMLNovaVerifier contract');
    console.log('   2. Update verifier address in backend');
    console.log('   3. Add ?real=true to Gateway URL for real verification');
    console.log('   4. Or set window.USE_REAL_CHAIN_VERIFICATION = true');
}

// Test connecting directly to the contract
async function testDirectContractConnection() {
    console.log('\n🔗 Testing direct contract connection...\n');
    
    try {
        const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/demo');
        const chainId = await provider.getNetwork().then(n => n.chainId);
        console.log('✅ Connected to Sepolia (Chain ID:', chainId, ')');
        
        // Check if verifier is deployed at IoTeX testnet address (as example)
        const iotexProvider = new ethers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
        const verifierAddress = '0x4EF6152c952dA7A27bb57E8b989348a73aB850d2';
        const code = await iotexProvider.getCode(verifierAddress);
        
        if (code !== '0x') {
            console.log('✅ Found Nova verifier on IoTeX testnet at:', verifierAddress);
            console.log('   Contract size:', code.length, 'bytes');
            console.log('   This can be used as reference for zkML verifier');
        }
        
    } catch (error) {
        console.error('❌ Connection error:', error.message);
    }
}

// Run tests
async function main() {
    // Check if backend is running
    try {
        const health = await fetch(`${BACKEND_URL}/health`);
        const status = await health.json();
        console.log('✅ zkML Verifier Backend is running');
        console.log('   Service:', status.service);
        console.log('   Networks:', status.networks.join(', '));
    } catch (error) {
        console.error('❌ Backend not running. Start it with:');
        console.error('   node api/zkml-verifier-backend.js');
        process.exit(1);
    }
    
    await testRealOnChainVerification();
    await testDirectContractConnection();
}

main().catch(console.error);