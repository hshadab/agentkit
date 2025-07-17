import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    
    // Send a test proof request
    const testRequest = {
        message: "Generate KYC proof",
        proof_id: "proof_kyc_test_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],
            step_size: 50
        }
    };
    
    console.log('📤 Sending:', JSON.stringify(testRequest, null, 2));
    ws.send(JSON.stringify(testRequest));
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString());
});

ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
});

ws.on('close', () => {
    console.log('🔌 WebSocket closed');
});

// Keep the process alive for 30 seconds
setTimeout(() => {
    ws.close();
    process.exit(0);
}, 30000);
