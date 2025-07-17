const WebSocket = require('ws');

async function testProofGeneration() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    return new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('Connected to WebSocket server');
            
            // Send proof generation request
            const request = {
                message: "Generate KYC proof",
                proof_id: "proof_kyc_test_" + Date.now(),
                metadata: {
                    function: "prove_kyc",
                    arguments: ["12345", "1"],
                    step_size: 50,
                    explanation: "Test KYC proof generation",
                    additional_context: null
                }
            };
            
            console.log('Sending request:', JSON.stringify(request, null, 2));
            ws.send(JSON.stringify(request));
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data);
            console.log('Received:', JSON.stringify(message, null, 2));
            
            if (message.type === 'proof_complete') {
                console.log('✅ Proof generation successful!');
                ws.close();
                resolve(message);
            } else if (message.type === 'proof_error') {
                console.error('❌ Proof generation failed:', message.error);
                ws.close();
                reject(new Error(message.error));
            }
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        });
        
        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
            ws.close();
            reject(new Error('Timeout waiting for proof generation'));
        }, 30000);
    });
}

// Run the test
testProofGeneration()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });