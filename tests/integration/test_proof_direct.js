import WebSocket from 'ws';

async function testProofGeneration() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('Connected to WebSocket');
            resolve();
        });
        ws.on('error', reject);
    });
    
    ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log('Received:', message.type);
        if (message.type === 'proof_complete') {
            console.log('Proof completed:', message.proof_id);
            process.exit(0);
        } else if (message.type === 'proof_error') {
            console.error('Proof error:', message.error);
            process.exit(1);
        } else if (message.type === 'proof_status') {
            console.log('Proof status:', message.status);
        }
    });
    
    // Send proof generation request
    const proofRequest = {
        type: 'generate_proof',
        proof_id: `proof_kyc_${Date.now()}`,
        metadata: {
            function: 'prove_kyc',
            arguments: ['john_doe_wallet', '12345678', '1234567890', '1234567890', '30'],
            proofId: `proof_kyc_${Date.now()}`,
            timestamp: Date.now(),
            explanation: 'KYC proof for John Doe',
            additional_context: 'Age verification required'
        }
    };
    
    console.log('Sending proof request...');
    ws.send(JSON.stringify(proofRequest));
    
    // Wait for response
    setTimeout(() => {
        console.error('Timeout waiting for proof');
        process.exit(1);
    }, 30000);
}

testProofGeneration().catch(console.error);