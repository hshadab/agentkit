import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8001/ws');

ws.on('open', () => {
    console.log('Connected to WebSocket');
    
    // Listen for all messages
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`[${new Date().toISOString()}] Received: ${message.type}`);
        
        // Handle different message types
        switch(message.type) {
            case 'device_registration_request':
                console.log('  -> Sending device registration response');
                ws.send(JSON.stringify({
                    type: 'device_registration_response',
                    requestId: message.requestId,
                    success: true,
                    ioId: `ioID_${message.deviceId}_${Date.now()}`,
                    did: `did:io:${message.deviceId}`,
                    txHash: '0x' + 'a'.repeat(64)
                }));
                break;
                
            case 'iotex_verification_request':
                console.log('  -> Sending IoTeX verification response');
                ws.send(JSON.stringify({
                    type: 'iotex_verification_response',
                    requestId: message.requestId,
                    success: true,
                    transactionHash: '0x' + 'b'.repeat(64),
                    blockNumber: 12345
                }));
                break;
                
            case 'workflow_step_update':
                console.log(`  Step ${message.stepId}: ${message.updates.status}`);
                break;
                
            case 'workflow_completed':
                console.log(`  Workflow completed: ${message.success ? 'SUCCESS' : 'FAILED'}`);
                if (!message.success) {
                    console.log(`  Error: ${message.error}`);
                }
                setTimeout(() => process.exit(0), 1000);
                break;
                
            case 'proof_complete':
                console.log(`  Proof completed: ${message.proof_id}`);
                break;
                
            case 'proof_status':
                console.log(`  Proof status: ${message.status}`);
                break;
        }
    });
});

// Send workflow command after connection
setTimeout(() => {
    console.log('Sending workflow command...');
    ws.send(JSON.stringify({
        type: 'execute_workflow',
        command: 'Register IoT device TEST456 with proximity proof'
    }));
}, 1000);

// Exit after 90 seconds if not completed
setTimeout(() => {
    console.error('Timeout after 90 seconds');
    process.exit(1);
}, 90000);