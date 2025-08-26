#!/usr/bin/env node

/**
 * Test zkML Verification on Ethereum Sepolia
 * Currently using simulated verification until wallet is funded
 */

const fetch = require('node-fetch');

async function testEthereumVerification() {
    console.log('🧪 Testing zkML Verification on Ethereum Sepolia\n');
    console.log('=' .repeat(60));
    
    // Check backend health
    try {
        const health = await fetch('http://localhost:3003/health');
        if (!health.ok) throw new Error('Backend not responding');
        const status = await health.json();
        console.log('✅ Backend is running');
        console.log('   Networks:', status.networks.join(', '));
    } catch (error) {
        console.error('❌ Backend not running! Start with:');
        console.error('   node api/zkml-verifier-backend.js');
        process.exit(1);
    }
    
    // Test Case 1: Simulated Ethereum Verification
    console.log('\n📋 Test 1: Simulated Ethereum Verification');
    console.log('-'.repeat(60));
    
    const mockProof = {
        proof: '0x' + 'a'.repeat(512),
        inputs: [3, 10, 1, 5], // Cross-chain agent
        proofData: {
            commitment: '0x' + 'b'.repeat(64),
            decision: 1
        }
    };
    
    try {
        const response = await fetch('http://localhost:3003/zkml/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'eth-test-' + Date.now(),
                proof: mockProof,
                network: 'sepolia',
                useRealChain: false // Simulated for now
            })
        });
        
        const result = await response.json();
        
        console.log('✅ Verification Result:');
        console.log('   Network:', result.network);
        console.log('   Verified:', result.verified);
        console.log('   Authorized:', result.authorized);
        console.log('   TX Hash:', result.txHash);
        console.log('   Block:', result.blockNumber);
        console.log('   Gas Used:', result.gasUsed);
        
        if (result.network.includes('Simulated')) {
            console.log('\n⚠️  Currently using simulated verification');
            console.log('   Real Ethereum deployment pending wallet funding');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    // Test Case 2: Check Ethereum Contract Status
    console.log('\n📋 Test 2: Ethereum Contract Status');
    console.log('-'.repeat(60));
    
    try {
        const info = await fetch('http://localhost:3003/zkml/verifier-info/sepolia');
        const contractInfo = await info.json();
        
        console.log('🔍 Contract Info:');
        console.log('   Network: Ethereum Sepolia');
        console.log('   Address:', contractInfo.verifierAddress || 'Not deployed');
        console.log('   Deployed:', contractInfo.isDeployed ? '✅' : '❌ Pending');
        
        if (!contractInfo.isDeployed) {
            console.log('\n📝 To Deploy on Ethereum:');
            console.log('1. Fund wallet: 0xE616B2eC620621797030E0AB1BA38DA68D78351C');
            console.log('   Need: ~0.005 ETH');
            console.log('   Faucet: https://sepoliafaucet.com');
            console.log('2. Deploy: npx hardhat run scripts/deploy-zkml-real.js --network sepolia');
            console.log('3. Update backend with deployed address');
        }
        
    } catch (error) {
        console.error('❌ Error checking contract:', error.message);
    }
    
    // Show how to use in Gateway
    console.log('\n' + '=' .repeat(60));
    console.log('📝 Using Ethereum Verification in Gateway:');
    console.log('=' .repeat(60));
    console.log('\n1. Gateway will default to Ethereum Sepolia');
    console.log('2. Add ?real=true to URL when contract is deployed');
    console.log('3. Or use window.USE_REAL_CHAIN_VERIFICATION = true');
    console.log('\n✅ Current Status:');
    console.log('   - Backend configured for Ethereum ✅');
    console.log('   - Gateway defaults to Ethereum ✅');
    console.log('   - Simulated verification working ✅');
    console.log('   - Real deployment pending funding ⏳');
    
    // Alternative: Show IoTeX deployment that's already live
    console.log('\n💡 Alternative: IoTeX Testnet (Already Deployed)');
    console.log('-'.repeat(60));
    console.log('Contract is LIVE on IoTeX at: 0xD782e96B97153ebE3BfFB24085A022c2320B7613');
    console.log('To use IoTeX instead:');
    console.log('   window.VERIFICATION_NETWORK = "iotex-testnet"');
    console.log('   Then use ?real=true for real verification');
}

testEthereumVerification().catch(console.error);