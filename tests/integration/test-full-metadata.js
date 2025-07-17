import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected');
    
    // Send message exactly like the frontend would after getting Python response
    const fullMessage = {
        message: "Generate KYC proof",
        proof_id: "proof_kyc_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],  // IMPORTANT: Two arguments
            step_size: 50,
            explanation: "Zero-knowledge proof generation",
            additional_context: null
        }
    };
    
    console.log('📤 Sending:', JSON.stringify(fullMessage, null, 2));
    ws.send(JSON.stringify(fullMessage));
});

ws.on('message', (data) => {
    console.log('\n📥 Received:', data.toString());
    try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'proof_status') {
            console.log('⏳ Proof generation started!');
        } else if (msg.type === 'proof_complete') {
            console.log('✅ Proof completed!');
            process.exit(0);
        } else if (msg.type === 'proof_error') {
            console.error('❌ Proof error:', msg.error);
            process.exit(1);
        }
    } catch (e) {}
});

ws.on('error', (err) => {
    console.error('❌ Error:', err);
});

setTimeout(() => {
    console.log('⏰ Timeout after 20 seconds');
    ws.close();
    process.exit(1);
}, 20000);
