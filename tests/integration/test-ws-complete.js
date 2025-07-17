import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    
    // Send a test proof request with correct arguments
    const testRequest = {
        message: "Generate KYC proof",
        proof_id: "proof_kyc_test_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],  // Two arguments as expected
            step_size: 50
        }
    };
    
    console.log('📤 Sending:', JSON.stringify(testRequest, null, 2));
    ws.send(JSON.stringify(testRequest));
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString());
    const message = JSON.parse(data.toString());
    
    if (message.type === 'proof_error') {
        console.error('❌ Proof error:', message.error);
    } else if (message.type === 'proof_complete') {
        console.log('✅ Proof completed!');
        ws.close();
        process.exit(0);
    }
});

ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
});

ws.on('close', () => {
    console.log('🔌 WebSocket closed');
});

// Exit after 10 seconds
setTimeout(() => {
    console.log('⏰ Timeout - no response received');
    ws.close();
    process.exit(1);
}, 10000);
