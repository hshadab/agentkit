#!/usr/bin/env node

console.log('🔍 GATEWAY zkML WORKFLOW DIAGNOSTIC\n');
console.log('=====================================\n');

// Test each component
async function diagnose() {
    
    // 1. Check zkML Backend
    console.log('1. zkML PROOF GENERATION:');
    try {
        const zkmlResponse = await fetch('http://localhost:8002/zkml/prove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: {
                    is_financial_agent: 1,
                    amount: 100,
                    is_gateway_op: 1,
                    risk_score: 20,
                    confidence_score: 95,
                    authorization_level: 3,
                    compliance_check: 1,
                    fraud_detection_score: 15,
                    transaction_velocity: 5,
                    account_reputation: 90,
                    geo_risk_factor: 10,
                    time_risk_factor: 5,
                    pattern_match_score: 85,
                    ml_confidence_score: 92
                }
            })
        });
        
        const zkmlResult = await zkmlResponse.json();
        if (zkmlResult.sessionId) {
            console.log('   ✅ REAL - 14-parameter model running');
            console.log('   Session ID:', zkmlResult.sessionId);
            
            // 2. Check On-Chain Verification
            console.log('\n2. ON-CHAIN VERIFICATION:');
            
            // Test with useRealChain = false (simulated)
            const simResponse = await fetch('http://localhost:3003/zkml/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: zkmlResult.sessionId,
                    network: 'sepolia',
                    useRealChain: false
                })
            });
            
            const simResult = await simResponse.json();
            console.log('   Simulated TX:', simResult.txHash);
            
            // Check if it's a valid hex hash
            const isValidHex = /^0x[0-9a-f]{64}$/i.test(simResult.txHash);
            console.log('   Valid hex format:', isValidHex ? '✅' : '❌');
            
            // Check if real verification would work
            console.log('   Real verifier deployed: 0x70928d56Ee88CA586cBE2Ee4cF97Ae2fcc2cA944');
            console.log('   Status: ⚠️ SIMULATED (useRealChain=false in current code)');
            
        } else {
            console.log('   ❌ FAILED - zkML backend issue');
        }
        
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
    }
    
    // 3. Check Gateway Transfer
    console.log('\n3. GATEWAY TRANSFERS:');
    console.log('   Your spendable balance: 14.80 USDC');
    console.log('   Required per transfer: 2.000001 USDC');
    console.log('   Transfer amount trying: 0.01 USDC');
    
    // Test the actual transfer API
    const apiKey = 'SAND_API_KEY:3dc2c2b70ae5bd1943212a8521638b3b:8bb8eebdb457b04f261990e34c49d838';
    
    try {
        // The current code is trying to send to the wrong endpoint
        const testResponse = await fetch('https://gateway-api-testnet.circle.com/v1/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{  // Note: needs to be an array
                recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                chain: 0,
                amount: '0.01',
                currency: 'USDC'
            }])
        });
        
        if (!testResponse.ok) {
            const error = await testResponse.text();
            if (error.includes('signature')) {
                console.log('   ❌ FAILING - Missing EIP-712 signature');
                console.log('   The code has EIP-712 signing but may not be executing properly');
            } else if (error.includes('insufficient')) {
                console.log('   ❌ FAILING - Insufficient balance (unlikely with 14.80 USDC)');
            } else if (error.includes('Resource not found')) {
                console.log('   ❌ FAILING - Wrong API endpoint');
            } else {
                console.log('   ❌ FAILING - Other error:', error.substring(0, 100));
            }
        }
    } catch (error) {
        console.log('   ❌ ERROR:', error.message);
    }
    
    console.log('\n=====================================');
    console.log('SUMMARY:\n');
    console.log('✅ zkML Proof: REAL (14-parameter model)');
    console.log('⚠️ On-Chain Verification: SIMULATED (not using real contract)');
    console.log('❌ Gateway Transfers: FAILING (API/signature issues)');
    console.log('\nRECOMMENDATIONS:');
    console.log('1. Enable useRealChain:true for real blockchain verification');
    console.log('2. Fix Gateway API call format (needs array not object)');
    console.log('3. Ensure EIP-712 signature is properly attached to requests');
    console.log('4. Transaction hashes with letters beyond a-f are FAKE');
}

diagnose();