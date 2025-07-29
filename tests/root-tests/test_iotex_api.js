#!/usr/bin/env node

import fetch from 'node-fetch';

async function testIoTeXVerification() {
    console.log('🔧 Testing IoTeX On-Chain Verification\n');
    console.log('='.repeat(50) + '\n');
    
    try {
        // Step 1: Generate a device proximity proof via chat API
        console.log('📝 Step 1: Generating proof and triggering verification...\n');
        
        const message = "Generate device proximity proof for IoT device APITEST_" + Date.now() + 
                       " at coordinates x=3333, y=4444 and verify on IoTeX blockchain";
        
        console.log('Request:', message);
        console.log('');
        
        const response = await fetch('http://localhost:8002/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Response received:');
        console.log(JSON.stringify(result, null, 2));
        
        // Extract workflow info if available
        if (result.workflow_id) {
            console.log('\n📊 Workflow Details:');
            console.log('   Workflow ID:', result.workflow_id);
            console.log('   Status:', result.status || 'Processing');
        }
        
        if (result.steps) {
            console.log('\n📋 Workflow Steps:');
            result.steps.forEach((step, i) => {
                console.log(`   ${i + 1}. ${step.name}: ${step.status}`);
                if (step.result) {
                    console.log(`      Result: ${JSON.stringify(step.result).substring(0, 100)}...`);
                }
            });
        }
        
        // Wait for verification to complete
        console.log('\n⏳ Waiting 15 seconds for on-chain verification...\n');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Step 2: Check proof history
        console.log('📝 Step 2: Checking proof history...\n');
        
        const historyResponse = await fetch('http://localhost:8001/api/v1/proof-history');
        if (historyResponse.ok) {
            const history = await historyResponse.json();
            
            // Find IoTeX verifications
            const iotexProofs = history.filter(p => p.blockchain === 'iotex' || p.blockchain === 'IoTeX');
            
            console.log(`Found ${iotexProofs.length} IoTeX proof(s) in history`);
            
            if (iotexProofs.length > 0) {
                console.log('\nLatest IoTeX proof:');
                const latest = iotexProofs[iotexProofs.length - 1];
                console.log('   Proof ID:', latest.proofId);
                console.log('   Status:', latest.status);
                console.log('   Transaction:', latest.transactionHash || 'Pending');
                console.log('   Timestamp:', new Date(latest.timestamp).toISOString());
                
                if (latest.transactionHash) {
                    console.log('\n🔗 View on IoTeX Explorer:');
                    console.log(`   https://testnet.iotexscan.io/tx/${latest.transactionHash}`);
                }
            }
        }
        
        console.log('\n✅ Test complete!');
        console.log('\n📝 Notes:');
        console.log('- Check the UI at http://localhost:8001 for real-time updates');
        console.log('- Ensure MetaMask is connected to IoTeX testnet');
        console.log('- Contract address: 0x5967d15c7a6fD3ef7F1f309e766f35252a9de10d');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure both services are running:');
        console.error('   - Rust server on port 8001');
        console.error('   - Python service on port 8002');
        console.error('2. Check that MetaMask is connected in the browser');
        console.error('3. Verify you have IOTX testnet tokens for gas');
    }
}

// Run the test
testIoTeXVerification();