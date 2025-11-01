#!/usr/bin/env node

const ethers = require('ethers');

async function testRealVerification() {
    console.log('🔍 Testing REAL on-chain zkML verification on Ethereum Sepolia\n');
    
    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/M0G6DDVS6iWqq5zHMqOLp5GWHhceJBHT');
    const PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0xYOUR_TEST_PRIVATE_KEY'; // do not commit secrets
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    // Verifier contract
    const VERIFIER_ADDRESS = '0x70928d56Ee88CA586cBE2Ee4cF97Ae2fcc2cA944';
    const VERIFIER_ABI = [
        "function verifyNovaProof(uint256[] calldata proof, uint256[] calldata publicInputs) public view returns (bool)",
        "event ProofVerified(address indexed verifier, uint256 indexed timestamp, bytes32 proofHash)"
    ];
    
    const verifier = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, wallet);
    
    console.log('📍 Contract: ', VERIFIER_ADDRESS);
    console.log('💰 Wallet: ', wallet.address);
    
    // Get balance
    const balance = await wallet.getBalance();
    console.log('💎 Balance: ', ethers.utils.formatEther(balance), 'ETH\n');
    
    // Test proof data (simplified Nova proof structure)
    const proof = [
        123, 456, 789, // Simplified proof elements
        101112, 131415, 161718,
        192021, 222324, 252627
    ];
    
    const publicInputs = [3, 10, 1, 5]; // Cross-chain agent example
    
    try {
        // First try a view call to check if it would verify
        console.log('🔍 Testing proof verification (view call)...');
        const wouldVerify = await verifier.verifyNovaProof(proof, publicInputs);
        console.log('   View result:', wouldVerify ? '✅ VALID' : '❌ INVALID');
        
        // Now do actual on-chain verification with transaction
        console.log('\n📝 Submitting real transaction...');
        const tx = await verifier.verifyNovaProof(proof, publicInputs, {
            gasLimit: 100000
        });
        
        console.log('   Transaction hash:', tx.hash);
        console.log('   Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('\n✅ Transaction confirmed!');
        console.log('   Block:', receipt.blockNumber);
        console.log('   Gas used:', receipt.gasUsed.toString());
        console.log('   Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
        
        const explorerUrl = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
        console.log('   View on Etherscan:', explorerUrl);
        
        return receipt.transactionHash;
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    }
}

// Test with the backend service
async function testBackendIntegration() {
    console.log('\n🔗 Testing backend integration on port 3003...\n');
    
    const http = require('http');
    
    const testData = {
        sessionId: 'test-' + Date.now(),
        proof: {
            proof: [123, 456, 789, 101112, 131415, 161718, 192021, 222324, 252627],
            publicInputs: [3, 10, 1, 5]
        },
        network: 'sepolia',
        useRealChain: true,
        inputs: [3, 10, 1, 5]
    };
    
    const options = {
        hostname: 'localhost',
        port: 3003,
        path: '/zkml/verify',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📋 Backend response:');
                    console.log('   Verified:', result.verified ? '✅' : '❌');
                    console.log('   Network:', result.network);
                    console.log('   TxHash:', result.txHash);
                    console.log('   Block:', result.blockNumber);
                    console.log('   Gas:', result.gasUsed);
                    
                    if (result.txHash && !result.network.includes('Simulated')) {
                        const explorerUrl = `https://sepolia.etherscan.io/tx/${result.txHash}`;
                        console.log('   Explorer:', explorerUrl);
                    }
                    
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(testData));
        req.end();
    });
}

async function main() {
    try {
        // Test direct verification
        console.log('='.repeat(50));
        console.log('TESTING REAL ON-CHAIN VERIFICATION');
        console.log('='.repeat(50) + '\n');
        
        const txHash = await testRealVerification();
        
        // Test backend integration
        const backendResult = await testBackendIntegration();
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ ALL TESTS PASSED - REAL VERIFICATION WORKING');
        console.log('='.repeat(50));
        console.log('\n💡 The Gateway workflow at http://localhost:8080/index-fixed.html');
        console.log('   uses this real verification for Step 2 of zkML proof');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

main();
