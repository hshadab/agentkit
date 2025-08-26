const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('message', function(data) {
    const msg = JSON.parse(data);
    if (JSON.stringify(msg).includes('table') || JSON.stringify(msg).includes('workflow')) {
        console.log('WORKFLOW MESSAGE:', JSON.stringify(msg, null, 2));
    }
});

ws.on('open', function() {
    console.log('Connected to WebSocket');
});
