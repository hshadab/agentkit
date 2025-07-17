#!/usr/bin/env node

// Test to verify Ethereum verification works without person suffix

const WebSocket = require('ws');

async function testEthereumVerification() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('Connected to WebSocket');
            
            // Generate a simple KYC proof without person field
            const proofRequest = {
                message: 'Generate kyc proof',
                proof_id: `proof_kyc_${Date.now()}`,
                metadata: {
                    function: 'prove_kyc',
                    arguments: ['12345', '1'], // wallet_hash, kyc_approved
                    step_size: 50,
                    explanation: 'Testing KYC proof generation',
                    additional_context: {
                        test: true
                    }
                }
            };
            
            console.log('Sending proof request:', proofRequest);
            ws.send(JSON.stringify(proofRequest));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('Received:', message.type);
            
            if (message.type === 'proof_complete') {
                console.log('✅ Proof generated successfully:', message.proof_id);
                console.log('Proof can be verified at: /api/proof/' + message.proof_id + '/ethereum');
                ws.close();
                resolve(message.proof_id);
            } else if (message.type === 'proof_error') {
                console.error('❌ Proof generation failed:', message.error);
                ws.close();
                reject(new Error(message.error));
            } else if (message.type === 'proof_status') {
                console.log('Status:', message.message);
            }
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        });
    });
}

// Run test
testEthereumVerification()
    .then(proofId => {
        console.log('\n✅ Test completed successfully!');
        console.log(`Proof ID: ${proofId}`);
        console.log('\nTo verify on Ethereum:');
        console.log(`1. Open http://localhost:8001/api/proof/${proofId}/ethereum`);
        console.log('2. Use the manual verification tool at http://localhost:8001/manual_ethereum_verify.html');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });