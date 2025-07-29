import WebSocket from 'ws';

async function testDirectIoTeX() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket');
            resolve();
        });
        ws.on('error', reject);
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`[${new Date().toISOString()}] ${message.type}`);
        
        if (message.type === 'iotex_verification_response') {
            console.log('Response:', JSON.stringify(message, null, 2));
            setTimeout(() => process.exit(0), 500);
        }
    });
    
    // Send iotex verification request directly
    const request = {
        type: 'iotex_verification_request',
        workflowId: 'test_wf_' + Date.now(),
        stepId: 'step_3',
        proofId: 'test_proof_' + Date.now(),
        proofType: 'device_proximity',
        deviceId: 'TESTDEVICE001',
        requestId: 'test_req_' + Date.now(),
        proofData: {
            public_inputs: ['123456', '5050', '5050'],
            proof_type: 'device_proximity',
            metrics: {
                generation_time_secs: 10,
                proof_size: 1000000
            }
        }
    };
    
    console.log('📤 Sending direct iotex_verification_request...');
    ws.send(JSON.stringify(request));
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('⏱️  Test complete');
    process.exit(0);
}

testDirectIoTeX().catch(console.error);