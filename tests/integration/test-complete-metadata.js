import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected');
    
    const msg = {
        message: "Generate KYC proof",
        proof_id: "proof_kyc_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],
            step_size: 50,
            explanation: "Zero-knowledge proof generation",  // REQUIRED!
            additional_context: null                        // REQUIRED!
        }
    };
    
    console.log('📤 Sending with complete metadata...');
    ws.send(JSON.stringify(msg));
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString().substring(0, 100));
});

setTimeout(() => {
    ws.close();
}, 10000);
