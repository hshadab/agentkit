// Test if verify_on_avalanche message is sent
import WebSocket from 'ws';

async function testStep4() {
    console.log('Testing step 4 directly...');
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('Connected to WebSocket');
        
        // Send a verify_on_avalanche message directly
        const testMessage = {
            type: 'verify_on_avalanche',
            requestId: 'test_' + Date.now(),
            proofData: {
                proofId: 'proof_medical_integrity_test',
                proofType: 'medical_integrity',
                type: 'medical_integrity',
                public_inputs: ['12345', '734077919', '1753739256', '1753825656']
            },
            proofType: 'medical_integrity',
            recordId: '0xabc123def456789'
        };
        
        console.log('Sending test verify_on_avalanche message:', JSON.stringify(testMessage, null, 2));
        ws.send(JSON.stringify(testMessage));
        
        // Wait a bit then close
        setTimeout(() => {
            console.log('Test complete, closing connection');
            ws.close();
            process.exit(0);
        }, 5000);
    });
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Received message:', msg.type);
        if (msg.type === 'verification_result') {
            console.log('✅ Verification result received:', msg);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

testStep4().catch(console.error);