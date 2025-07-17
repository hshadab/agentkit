const WebSocket = require('ws');

async function testVerification(proofId) {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('Connected to WebSocket server');
            
            // Send verification request
            const request = {
                message: `Verify proof ${proofId}`,
                proof_id: proofId,
                metadata: {
                    function: "verify_proof",
                    arguments: [proofId],
                    step_size: 50,
                    explanation: "Verifying proof",
                    additional_context: {
                        is_verification: true
                    }
                }
            };
            
            console.log('Sending verification request for:', proofId);
            ws.send(JSON.stringify(request));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            console.log('Received:', JSON.stringify(message, null, 2));
            
            if (message.type === 'verification_complete') {
                console.log(`✅ Verification result: ${message.result}`);
                ws.close();
                resolve(message);
            } else if (message.type === 'verification_error') {
                console.error('❌ Verification failed:', message.error);
                ws.close();
                reject(new Error(message.error));
            }
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            ws.close();
            reject(new Error('Timeout waiting for verification'));
        }, 10000);
    });
}

// Run the test with the proof we just generated
const proofId = process.argv[2] || 'proof_kyc_test_1752591983385';
testVerification(proofId)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });