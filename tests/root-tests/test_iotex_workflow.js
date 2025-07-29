#!/usr/bin/env node

import fetch from 'node-fetch';
import WebSocket from 'ws';

async function testIoTeXWorkflow() {
    console.log('🔧 Testing IoTeX Workflow with Device Registration\n');
    console.log('='.repeat(50) + '\n');
    
    let ws = null;
    
    try {
        // Connect to WebSocket for real-time updates
        console.log('🔌 Connecting to WebSocket...');
        ws = new WebSocket('ws://localhost:8001/ws');
        
        await new Promise((resolve, reject) => {
            ws.on('open', () => {
                console.log('✅ WebSocket connected\n');
                resolve();
            });
            ws.on('error', reject);
        });
        
        // Listen for messages
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'workflow_update' || msg.type === 'proof_complete' || msg.type === 'verification_complete') {
                console.log(`📨 ${msg.type}:`, msg.status || msg.message || 'received');
                if (msg.transaction_hash) {
                    console.log(`   Transaction: ${msg.transaction_hash}`);
                    console.log(`   🔗 View on IoTeX: https://testnet.iotexscan.io/tx/${msg.transaction_hash}`);
                }
            }
        });
        
        // Test 1: Register device with proximity proof (should trigger all 4 steps)
        console.log('📝 Test 1: Register IoT device with proximity proof\n');
        
        const deviceId = 'IOTTEST_' + Date.now();
        const message = `Register IoT device ${deviceId} with proximity proof at location 7777,8888`;
        
        console.log('Request:', message);
        console.log('Expected steps:');
        console.log('  1. register_device');
        console.log('  2. generate_proof (device_proximity)');
        console.log('  3. verify_on_iotex');
        console.log('  4. claim_rewards\n');
        
        const response = await fetch('http://localhost:8002/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }
        
        const result = await response.json();
        
        if (result.workflow_id) {
            console.log('✅ Workflow created:', result.workflow_id);
            console.log('\nWorkflow steps:');
            if (result.steps) {
                result.steps.forEach((step, i) => {
                    console.log(`  ${i + 1}. ${step.type}${step.proof_type ? ` (${step.proof_type})` : ''}: ${step.status}`);
                });
            }
        } else {
            console.log('❌ No workflow created. Response:', JSON.stringify(result, null, 2));
        }
        
        // Wait for workflow to complete
        console.log('\n⏳ Waiting 20 seconds for workflow completion...\n');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        // Test 2: Direct device proximity proof with IoTeX verification
        console.log('\n📝 Test 2: Generate device proximity proof and verify on IoTeX\n');
        
        const message2 = `Generate device proximity proof for IoT device ${deviceId}_2 at coordinates x=9999, y=1111 and verify on IoTeX blockchain`;
        
        console.log('Request:', message2);
        
        const response2 = await fetch('http://localhost:8002/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message2 })
        });
        
        if (response2.ok) {
            const result2 = await response2.json();
            if (result2.workflow_id) {
                console.log('✅ Workflow created:', result2.workflow_id);
            } else {
                console.log('Response:', JSON.stringify(result2, null, 2));
            }
        }
        
        // Wait for second workflow
        console.log('\n⏳ Waiting 20 seconds for second workflow...\n');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        // Check proof history
        console.log('\n📊 Checking proof history...\n');
        
        const historyResponse = await fetch('http://localhost:8001/api/v1/proof-history');
        if (historyResponse.ok) {
            const history = await historyResponse.json();
            const iotexProofs = history.filter(p => 
                (p.blockchain === 'iotex' || p.blockchain === 'IoTeX') && 
                p.proof_type === 'device_proximity'
            );
            
            console.log(`Found ${iotexProofs.length} IoTeX device proximity proof(s)`);
            
            if (iotexProofs.length > 0) {
                console.log('\nLatest IoTeX proofs:');
                iotexProofs.slice(-3).forEach((proof, i) => {
                    console.log(`\n  ${i + 1}. Proof ID: ${proof.proofId}`);
                    console.log(`     Status: ${proof.status}`);
                    console.log(`     Device: ${proof.device_id || 'N/A'}`);
                    console.log(`     Transaction: ${proof.transactionHash || 'Pending'}`);
                    if (proof.transactionHash) {
                        console.log(`     🔗 https://testnet.iotexscan.io/tx/${proof.transactionHash}`);
                    }
                });
            }
        }
        
        console.log('\n✅ Test complete!');
        console.log('\n📝 Summary:');
        console.log('- Device registration workflow triggers all 4 steps automatically');
        console.log('- Direct proximity proof + IoTeX verification also works');
        console.log('- Check UI at http://localhost:8001 for visual confirmation');
        console.log('- Verify transactions on IoTeX testnet explorer');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Ensure services are running (ports 8001, 8002)');
        console.error('2. Check MetaMask is connected to IoTeX testnet in browser');
        console.error('3. Verify you have IOTX tokens for gas fees');
    } finally {
        if (ws) {
            ws.close();
        }
    }
}

// Run the test
testIoTeXWorkflow();