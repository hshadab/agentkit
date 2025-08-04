// Check if proof generation messages are being received
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

console.log('🔍 Monitoring WebSocket messages...\n');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket\n');
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data.toString());
        
        // Filter and display relevant messages
        if (message.type === 'proof_status' || 
            message.type === 'proof_complete' || 
            message.type === 'proof_error' ||
            message.content?.includes('proof')) {
            
            console.log(`📥 ${new Date().toISOString()} - ${message.type || 'content'}:`);
            
            if (message.proof_id) {
                console.log(`   Proof ID: ${message.proof_id}`);
            }
            
            if (message.status) {
                console.log(`   Status: ${message.status}`);
            }
            
            if (message.message) {
                console.log(`   Message: ${message.message}`);
            }
            
            if (message.error) {
                console.log(`   Error: ${message.error}`);
            }
            
            if (message.metrics) {
                console.log(`   Metrics:`, message.metrics);
            }
            
            console.log('');
        }
    } catch (e) {
        // Ignore non-JSON messages
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

// Keep running
console.log('Press Ctrl+C to stop monitoring\n');