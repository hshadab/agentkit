const WebSocket = require('ws');

console.log('🔍 Starting WebSocket monitor...\n');

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket server\n');
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data);
        console.log(`📨 Message Type: ${msg.type}`);
        console.log(`   Proof ID: ${msg.proof_id || 'N/A'}`);
        console.log(`   Workflow ID: ${msg.workflowId || msg.metadata?.additional_context?.workflow_id || 'NOT FOUND'}`);
        
        if (msg.type === 'verification_complete') {
            console.log(`   Result: ${msg.result}`);
            console.log(`   Has workflowId field: ${msg.workflowId ? 'YES' : 'NO'}`);
            console.log(`   Has metadata.additional_context: ${msg.metadata?.additional_context ? 'YES' : 'NO'}`);
        }
        
        if (msg.type === 'verification_status') {
            console.log(`   Has workflow context: ${msg.additional_context || msg.metadata?.additional_context ? 'YES' : 'NO'}`);
        }
        
        console.log('---\n');
    } catch (e) {
        console.log('📨 Raw message:', data.toString());
    }
});

ws.on('error', (err) => {
    console.error('❌ Error:', err.message);
});

ws.on('close', () => {
    console.log('🔌 Disconnected');
});
