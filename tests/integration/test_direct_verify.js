#!/usr/bin/env node

const WebSocket = require('ws');

async function testDirectVerification() {
    console.log('=== Testing Direct Backend Verification ===\n');
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket\n');
            
            // First, let's generate a proof to get a valid ID
            console.log('Generating test proof...');
            const proofId = `proof_kyc_${Date.now()}`;
            
            ws.send(JSON.stringify({
                message: 'Generate kyc proof',
                proof_id: proofId,
                metadata: {
                    function: 'prove_kyc',
                    arguments: ['12345', '1'],
                    step_size: 50,
                    explanation: 'Test proof for verification',
                    additional_context: {
                        test: true
                    }
                }
            }));
            
            let waitingForProof = true;
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'proof_complete' && waitingForProof) {
                    waitingForProof = false;
                    console.log(`✅ Proof generated: ${message.proof_id}\n`);
                    
                    // Now send direct verification request
                    console.log('Sending direct verification request...');
                    
                    const verifyRequest = {
                        message: `Verify proof ${message.proof_id}`,
                        proof_id: message.proof_id,
                        metadata: {
                            function: 'verify_proof',
                            arguments: [message.proof_id],
                            step_size: 50,
                            explanation: 'Direct verification test',
                            additional_context: {
                                test: true,
                                direct: true
                            }
                        }
                    };
                    
                    console.log('Sending:', JSON.stringify(verifyRequest, null, 2));
                    ws.send(JSON.stringify(verifyRequest));
                    
                } else if (message.type === 'verification_complete') {
                    console.log(`\n✅ Verification complete!`);
                    console.log(`   Result: ${message.result}`);
                    console.log(`   Proof ID: ${message.proof_id}`);
                    
                    ws.close();
                    resolve(true);
                    
                } else if (message.type === 'verification_error') {
                    console.error(`\n❌ Verification error: ${message.error}`);
                    ws.close();
                    reject(new Error(message.error));
                    
                } else if (message.type === 'proof_status' || message.type === 'verification_status') {
                    console.log(`   ${message.message}`);
                }
            });
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        });
        
        setTimeout(() => {
            ws.close();
            reject(new Error('Timeout after 30 seconds'));
        }, 30000);
    });
}

testDirectVerification()
    .then(() => {
        console.log('\n✅ Direct backend verification works!');
        console.log('\nThe issue is in the workflow parsing layer.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    });