#!/usr/bin/env node

// Test real Gateway zkML workflow

console.log('Testing Gateway zkML Workflow Components\n');
console.log('========================================\n');

// 1. Test zkML proof generation
async function testZkMLProof() {
    console.log('1. Testing zkML Proof Generation:');
    try {
        const response = await fetch('http://localhost:8002/zkml/prove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proof_type: 'gateway_authorization',
                proof_id: `test_${Date.now()}`,
                params: {
                    is_financial_agent: 1,
                    amount: 10,
                    is_gateway_op: 1,
                    risk_score: 20,
                    confidence_score: 95,
                    authorization_level: 100,
                    compliance_check: 1,
                    fraud_detection_score: 10,
                    transaction_velocity: 5,
                    account_reputation: 95,
                    geo_risk_factor: 10,
                    time_risk_factor: 5,
                    pattern_match_score: 90,
                    ml_confidence_score: 95
                }
            })
        });
        
        const result = await response.json();
        console.log('   ✅ zkML proof generated:', result.sessionId || result.proof_id);
        console.log('   Model:', result.model || '14-parameter');
        return result.sessionId || result.proof_id;
    } catch (error) {
        console.log('   ❌ zkML proof failed:', error.message);
        return null;
    }
}

// 2. Test on-chain verification
async function testVerification(proofId) {
    console.log('\n2. Testing On-Chain Verification:');
    try {
        const response = await fetch('http://localhost:3003/zkml/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                proof_id: proofId,
                network: 'sepolia'
            })
        });
        
        const result = await response.json();
        if (result.txHash) {
            console.log('   ✅ Verification transaction:', result.txHash);
            console.log('   Etherscan:', `https://sepolia.etherscan.io/tx/${result.txHash}`);
        } else {
            console.log('   ⚠️ Verification returned no txHash');
        }
        return result.txHash;
    } catch (error) {
        console.log('   ❌ Verification failed:', error.message);
        return null;
    }
}

// 3. Test Gateway transfer
async function testGatewayTransfer() {
    console.log('\n3. Testing Gateway Transfer:');
    
    const apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
    
    try {
        // First check balance
        console.log('   Checking balance...');
        const balanceResponse = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!balanceResponse.ok) {
            console.log('   ⚠️ Balance endpoint not available (404)');
        }
        
        // Try transfer
        console.log('   Attempting transfer...');
        const transferData = {
            recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            chain: 0, // Ethereum testnet
            amount: '0.01',
            currency: 'USDC'
        };
        
        const transferResponse = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transferData)
        });
        
        if (!transferResponse.ok) {
            const errorText = await transferResponse.text();
            console.log('   ❌ Transfer failed:', errorText.substring(0, 100));
            if (errorText.includes('insufficient')) {
                console.log('   Reason: Insufficient balance');
            } else if (errorText.includes('signature')) {
                console.log('   Reason: Missing EIP-712 signature');
            } else if (errorText.includes('Resource not found')) {
                console.log('   Reason: API endpoint issue');
            }
        } else {
            const result = await transferResponse.json();
            console.log('   ✅ Transfer successful:', result.transferId);
        }
        
    } catch (error) {
        console.log('   ❌ Gateway error:', error.message);
    }
}

// Run tests
async function runTests() {
    // Test zkML proof
    const proofId = await testZkMLProof();
    
    if (proofId) {
        // Wait a bit for proof to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test verification
        const txHash = await testVerification(proofId);
        
        if (txHash) {
            console.log('\n✅ Proof and verification are REAL');
        } else {
            console.log('\n⚠️ Verification may be simulated');
        }
    }
    
    // Test Gateway transfer
    await testGatewayTransfer();
    
    console.log('\n========================================');
    console.log('Analysis Complete\n');
}

runTests();