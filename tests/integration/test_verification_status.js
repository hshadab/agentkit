import WebSocket from 'ws';

async function testVerificationStatus() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected');
            resolve();
        });
        ws.on('error', reject);
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        const type = message.type;
        
        // Log key messages
        if (type === 'workflow_step_update') {
            console.log(`[STEP] ${message.stepId}: ${message.updates.status}`);
            if (message.updates.error) {
                console.log(`  Error: ${message.updates.error}`);
            }
            if (message.updates.txHash) {
                console.log(`  TX: ${message.updates.txHash}`);
            }
        } else if (type === 'iotex_verification_response') {
            console.log(`[VERIFICATION] Success: ${message.success}`);
            if (!message.success) {
                console.log(`  Error: ${message.error}`);
            }
        } else if (type === 'workflow_completed') {
            console.log(`[COMPLETED] Success: ${message.success}`);
            if (!message.success) {
                console.log(`  Error: ${message.error}`);
            }
            setTimeout(() => process.exit(0), 1000);
        }
    });
    
    // Just send the verification request and don't respond
    // This will show us what the actual browser is doing
    setTimeout(() => {
        console.log('\n📤 Sending iotex_verification_request...');
        ws.send(JSON.stringify({
            type: 'iotex_verification_request',
            workflowId: 'test_wf',
            stepId: 'step_3',
            proofId: 'test_proof',
            proofType: 'device_proximity',
            deviceId: 'TEST001',
            requestId: 'test_req',
            proofData: {
                proof_data: 'dGVzdA==', // base64 'test'
                public_inputs: {
                    execution_z0: ['5050', '5050']
                },
                metadata: {
                    arguments: ['123456', '5050', '5050']
                }
            }
        }));
    }, 1000);
    
    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 10000));
    process.exit(0);
}

testVerificationStatus().catch(console.error);