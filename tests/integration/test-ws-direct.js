import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:8001/ws');
ws.on('open', () => {
    const msg = {
        message: "Generate KYC proof",
        proof_id: "proof_kyc_test_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],
            step_size: 50,
            explanation: "Zero-knowledge proof generation",
            additional_context: null
        }
    };
    ws.send(JSON.stringify(msg));
});
ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'proof_complete') {
        console.log("✅ WebSocket test passed");
        process.exit(0);
    }
});
setTimeout(() => {
    console.log("❌ WebSocket test timeout");
    process.exit(1);
}, 20000);
