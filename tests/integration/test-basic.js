import WebSocket from 'ws';

console.log('Creating WebSocket connection...');
const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ WebSocket opened');
    
    const testMsg = JSON.stringify({
        message: "Generate KYC proof",
        proof_id: "proof_kyc_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],
            step_size: 50
        }
    });
    
    console.log('📤 Sending message...');
    console.log('Message content:', testMsg);
    
    ws.send(testMsg);
    console.log('✅ Message sent');
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

// Keep alive for 10 seconds
setTimeout(() => {
    console.log('⏰ Timeout - closing connection');
    ws.close();
}, 10000);
