const WebSocket = require('ws');

console.log('🔌 Connecting to ws://localhost:8001/ws...');

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected!');
    ws.send('{"type":"test","message":"hello"}');
    setTimeout(() => ws.close(), 1000);
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString());
});

ws.on('close', (code) => {
    console.log(`🔌 Closed with code: ${code}`);
    process.exit(code === 1000 ? 0 : 1);
});

ws.on('error', (error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('⏰ Timeout');
    process.exit(1);
}, 3000);
