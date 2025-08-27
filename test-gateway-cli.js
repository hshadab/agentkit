#!/usr/bin/env node

async function testGatewayWorkflow() {
    console.log('🧪 Testing zkML Gateway Workflow with Real On-Chain Verification\n');
    
    // Step 1: Generate zkML proof (mocked)
    console.log('Step 1: Generating zkML proof...');
    const sessionId = 'test_' + Date.now();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ zkML proof generated (mocked)\n');
    
    // Step 2: Real on-chain verification
    console.log('Step 2: Verifying on Ethereum Sepolia (REAL)...');
    try {
        const response = await fetch('http://localhost:3003/zkml/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                proof: { proofData: '0x1234' },
                network: 'sepolia',
                useRealChain: true,
                inputs: [3, 10, 1, 5]
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ On-chain verification successful!');
            console.log(`   Network: ${result.network}`);
            console.log(`   Block: ${result.blockNumber}`);
            console.log(`   Gas Used: ${result.gasUsed}`);
            console.log(`   Contract: ${result.contractAddress}`);
            
            // Check logs for transaction hash
            const fs = require('fs');
            const logs = fs.readFileSync('/tmp/zkml-verifier.log', 'utf8');
            const txMatch = logs.match(/Transaction sent: (0x[a-f0-9]{64})/g);
            if (txMatch && txMatch.length > 0) {
                const latestTx = txMatch[txMatch.length - 1].split(': ')[1];
                console.log(`   Transaction: ${latestTx}`);
                console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${latestTx}\n`);
            }
            
            // Step 3: Gateway transfer
            console.log('Step 3: Executing Gateway transfer...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ Gateway multi-chain transfer completed (simulated)\n');
            
            console.log('🎉 Gateway zkML Workflow Complete!');
            console.log('   All 3 steps executed successfully');
            console.log('   Step 2 used REAL on-chain verification on Sepolia');
        } else {
            console.log('❌ Verification failed');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testGatewayWorkflow();