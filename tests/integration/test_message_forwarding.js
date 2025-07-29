import WebSocket from 'ws';

async function testMessageForwarding() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    await new Promise((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected to WebSocket');
            resolve();
        });
        ws.on('error', reject);
    });
    
    let receivedProofComplete = false;
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`📨 Received message type: ${message.type}`);
            
            if (message.type === 'proof_complete') {
                console.log('✅ PROOF_COMPLETE RECEIVED!');
                console.log('  Proof ID:', message.proof_id);
                console.log('  Has proof_data:', !!message.proof_data);
                console.log('  Proof data length:', message.proof_data?.length);
                receivedProofComplete = true;
            }
        } catch (e) {
            console.log('Raw message:', data.toString());
        }
    });
    
    // Send a proof generation request
    setTimeout(() => {
        const proofRequest = {
            message: "Generate device_proximity proof",
            proof_id: `test_proof_${Date.now()}`,
            metadata: {
                function: "prove_device_proximity",
                arguments: ["123456", "5050", "5050"],
                step_size: 50,
                explanation: "Test proof generation",
                additional_context: {
                    workflow_id: "test_workflow",
                    step_index: 0
                }
            }
        };
        
        console.log('📤 Sending proof generation request...');
        ws.send(JSON.stringify(proofRequest));
    }, 1000);
    
    // Wait 30 seconds for proof completion
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    if (!receivedProofComplete) {
        console.log('❌ PROOF_COMPLETE NOT RECEIVED after 30 seconds');
    }
    
    ws.close();
    process.exit(receivedProofComplete ? 0 : 1);
}

testMessageForwarding().catch(console.error);