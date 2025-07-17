#!/usr/bin/env node

import WebSocket from 'ws';

async function testVerification() {
    console.log("🧪 Testing verification with proof ID handling fix...");
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket');
            
            // Test verification with the exact proof ID
            const proofId = 'proof_kyc_1752599287763';
            console.log(`\n📋 Testing verification for: ${proofId}`);
            
            const verifyRequest = {
                message: `Verify proof ${proofId}`,
                proof_id: proofId,
                metadata: {
                    function: 'verify_proof',
                    arguments: [proofId],
                    step_size: 50,
                    explanation: "Testing proof verification",
                    additional_context: {
                        test: true
                    }
                }
            };
            
            console.log('📤 Sending verification request...');
            ws.send(JSON.stringify(verifyRequest));
            
            // Set timeout
            const timeout = setTimeout(() => {
                console.error('❌ Verification timeout - no response received');
                ws.close();
                reject(new Error('Verification timeout'));
            }, 10000);
            
            ws.on('message', (data) => {
                const message = JSON.parse(data);
                console.log(`📨 Received: ${message.type}`);
                
                if (message.type === 'verification_complete') {
                    clearTimeout(timeout);
                    console.log(`✅ Verification complete for ${message.proof_id}`);
                    console.log(`   Result: ${message.result}`);
                    console.log(`   Valid: ${message.result === 'VALID'}`);
                    ws.close();
                    resolve(message);
                } else if (message.type === 'verification_error') {
                    clearTimeout(timeout);
                    console.error(`❌ Verification error: ${message.error}`);
                    ws.close();
                    reject(new Error(message.error));
                } else if (message.type === 'verification_status') {
                    console.log(`   Status: ${message.status} - ${message.message}`);
                }
            });
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
            reject(error);
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket closed');
        });
    });
}

// Run the test
testVerification()
    .then(result => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    });