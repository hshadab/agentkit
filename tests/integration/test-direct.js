import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected');
    
    // Send a simple message without metadata to trigger Python path
    const simple = {
        message: "Generate KYC proof"
    };
    
    console.log('📤 Sending simple:', JSON.stringify(simple));
    ws.send(JSON.stringify(simple));
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString());
});

ws.on('error', (err) => {
    console.error('❌ Error:', err);
});

setTimeout(() => {
    console.log('⏰ Timeout');
    ws.close();
    process.exit(0);
}, 5000);
