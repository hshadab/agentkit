import WebSocket from 'ws';

async function testDeviceProximityOnly() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket');
            resolve();
        });
        ws.on('error', reject);
    });
    
    let proofCompleted = false;
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`[${new Date().toISOString()}] ${message.type}`);
        
        if (message.type === 'proof_complete') {
            console.log('✅ Proof completed:', message.proof_id);
            console.log('   Metrics:', JSON.stringify(message.metrics));
            console.log('   Public inputs:', message.public_inputs);
            proofCompleted = true;
            setTimeout(() => process.exit(0), 1000);
        } else if (message.type === 'proof_error') {
            console.error('❌ Proof error:', message.error);
            process.exit(1);
        } else if (message.type === 'proof_status') {
            console.log('   Status:', message.status);
        }
    });
    
    // Send proof generation request directly
    const proofRequest = {
        type: 'generate_proof',
        proof_id: `proof_device_proximity_${Date.now()}`,
        metadata: {
            function: 'prove_device_proximity',
            arguments: ['123456', '5050', '5050'], // device_id (numeric), x, y
            proofId: `proof_device_proximity_${Date.now()}`,
            timestamp: Date.now(),
            explanation: 'Testing device proximity proof',
            additional_context: 'Direct proof test',
            step_size: 10
        }
    };
    
    console.log('🚀 Sending device proximity proof request...');
    console.log('   Device ID:', proofRequest.metadata.arguments[0]);
    console.log('   Location: (', proofRequest.metadata.arguments[1], ',', proofRequest.metadata.arguments[2], ')');
    ws.send(JSON.stringify(proofRequest));
    
    // Wait for response
    setTimeout(() => {
        if (!proofCompleted) {
            console.error('⏱️  Timeout waiting for proof');
            process.exit(1);
        }
    }, 60000);
}

testDeviceProximityOnly().catch(console.error);