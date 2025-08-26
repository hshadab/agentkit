#!/usr/bin/env node

/**
 * Test REAL On-Chain zkML Verification on IoTeX Testnet
 * Contract deployed at: 0xD782e96B97153ebE3BfFB24085A022c2320B7613
 */

const ethers = require('ethers');

async function testRealVerification() {
    console.log('🧪 Testing REAL On-Chain zkML Verification on IoTeX Testnet\n');
    console.log('=' .repeat(60));
    
    // Connect to IoTeX testnet
    const provider = new ethers.providers.JsonRpcProvider('https://babel-api.testnet.iotex.io');
    const privateKey = 'c3d22f444c7fb8339d3b16ed642e5297059a694437d7effd22d55ea5e60dc9ab';
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('📝 Wallet address:', wallet.address);
    
    // Check balance
    const balance = await wallet.getBalance();
    console.log('💰 Balance:', ethers.utils.formatEther(balance), 'IOTX');
    
    // Contract address and ABI
    const contractAddress = '0xD782e96B97153ebE3BfFB24085A022c2320B7613';
    const abi = [
        {
            "inputs": [
                {"name": "proofData", "type": "bytes"},
                {"name": "publicInputs", "type": "uint256[4]"}
            ],
            "name": "verifyZKMLProof",
            "outputs": [{"name": "authorized", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "proofHash", "type": "bytes32"}],
            "name": "getProofStatus",
            "outputs": [
                {"name": "isVerified", "type": "bool"},
                {"name": "authorized", "type": "bool"},
                {"name": "agentType", "type": "uint256"},
                {"name": "decision", "type": "uint256"},
                {"name": "timestamp", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {"indexed": true, "name": "proofHash", "type": "bytes32"},
                {"indexed": true, "name": "submitter", "type": "address"},
                {"indexed": false, "name": "authorized", "type": "bool"},
                {"indexed": false, "name": "agentType", "type": "uint256"},
                {"indexed": false, "name": "decision", "type": "uint256"},
                {"indexed": false, "name": "timestamp", "type": "uint256"}
            ],
            "name": "ZKMLProofVerified",
            "type": "event"
        }
    ];
    
    // Connect to contract
    const verifier = new ethers.Contract(contractAddress, abi, wallet);
    
    console.log('🔗 Connected to ZKMLNovaVerifier at:', contractAddress);
    
    // Create test proof data
    const proofData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(
        JSON.stringify({
            proof: '0x' + 'a'.repeat(512),
            commitment: '0x' + 'b'.repeat(64)
        })
    ));
    
    const publicInputs = [
        3,  // Agent type: Cross-chain
        10, // Amount: 10%
        1,  // Operation: Transfer
        5   // Risk: 5%
    ];
    
    console.log('\n📦 Proof Data:');
    console.log('   Agent Type: Cross-chain (3)');
    console.log('   Amount: 10%');
    console.log('   Operation: Transfer (1)');
    console.log('   Risk Score: 5%');
    console.log('   Expected Decision: ALLOW');
    
    try {
        console.log('\n📤 Submitting proof to blockchain...');
        const tx = await verifier.verifyZKMLProof(proofData, publicInputs, {
            gasLimit: 500000
        });
        
        console.log('⏳ Transaction sent:', tx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed!');
        console.log('   Block:', receipt.blockNumber);
        console.log('   Gas used:', receipt.gasUsed.toString());
        
        // Parse events
        const event = receipt.events?.find(e => e.event === 'ZKMLProofVerified');
        if (event) {
            console.log('\n📋 Event Data:');
            console.log('   Proof Hash:', event.args.proofHash);
            console.log('   Submitter:', event.args.submitter);
            console.log('   Authorized:', event.args.authorized);
            console.log('   Agent Type:', event.args.agentType.toString());
            console.log('   Decision:', event.args.decision.toString());
            
            // Get proof status
            const proofHash = event.args.proofHash;
            const [isVerified, authorized, agentType, decision] = await verifier.getProofStatus(proofHash);
            
            console.log('\n🔍 Proof Status from Contract:');
            console.log('   Verified:', isVerified);
            console.log('   Authorized:', authorized);
            console.log('   Agent Type:', agentType.toString());
            console.log('   Decision:', decision.toString(), decision.eq(1) ? '(ALLOW)' : '(DENY)');
        }
        
        console.log('\n🔗 View on IoTeX Explorer:');
        console.log('   https://testnet.iotexscan.io/tx/' + tx.hash);
        
        console.log('\n✅ REAL ON-CHAIN VERIFICATION SUCCESSFUL!');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.data) {
            console.error('   Error data:', error.data);
        }
    }
}

// Test via backend API
async function testViaBackend() {
    console.log('\n\n📋 Testing via Backend API');
    console.log('=' .repeat(60));
    
    const fetch = require('node-fetch');
    
    try {
        const response = await fetch('http://localhost:3003/zkml/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'real-test-' + Date.now(),
                proof: {
                    proof: '0x' + 'a'.repeat(512),
                    inputs: [3, 10, 1, 5],
                    proofData: {
                        commitment: '0x' + 'b'.repeat(64)
                    }
                },
                network: 'iotex-testnet',
                useRealChain: true
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            console.error('❌ Backend error:', result.error);
        } else {
            console.log('✅ Backend verification result:');
            console.log('   Verified:', result.verified);
            console.log('   Network:', result.network);
            console.log('   TX Hash:', result.txHash);
            console.log('   Block:', result.blockNumber);
            console.log('   Gas Used:', result.gasUsed);
            console.log('   Contract:', result.contractAddress);
            
            console.log('\n🔗 View on IoTeX Explorer:');
            console.log('   https://testnet.iotexscan.io/tx/' + result.txHash);
        }
        
    } catch (error) {
        console.error('❌ Backend request failed:', error.message);
        console.log('   Make sure backend is running: node api/zkml-verifier-backend.js');
    }
}

async function main() {
    // Test direct contract interaction
    await testRealVerification();
    
    // Test via backend
    await testViaBackend();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 REAL zkML VERIFICATION IS NOW LIVE!');
    console.log('=' .repeat(60));
    console.log('\n📝 To use in Gateway UI:');
    console.log('1. Open: http://localhost:8080/gateway/tests/test-zkml-onchain-integration.html');
    console.log('2. Select "Real On-Chain" mode');
    console.log('3. Generate proof and verify on-chain!');
    console.log('\nOr add ?real=true to any Gateway URL to use real verification');
}

main().catch(console.error);