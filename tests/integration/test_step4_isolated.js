// Test step 4 in isolation
import WebSocket from 'ws';

async function testStep4Isolated() {
    console.log('🔍 Testing step 4 (verify_on_avalanche) in isolation...');
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('✅ Connected');
        
        // Simulate a medical integrity proof from step 3
        const mockProof = {
            proofId: 'proof_medical_integrity_test123',
            proofType: 'medical_integrity',
            type: 'medical_integrity',
            public_inputs: ['12345', '734077919', '1753739256', '1753825656'],
            proof_data: 'mock_proof_data',
            success: true
        };
        
        // Send verify_on_avalanche message
        const verifyMessage = {
            type: 'verify_on_avalanche',
            requestId: 'test_verify_' + Date.now(),
            proofData: mockProof,
            proofType: 'medical_integrity',
            recordId: '0xabc123def456789'
        };
        
        console.log('📤 Sending verify_on_avalanche message...');
        console.log(JSON.stringify(verifyMessage, null, 2));
        ws.send(JSON.stringify(verifyMessage));
    });
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`📨 Received: ${msg.type}`);
            
            if (msg.type === 'verify_on_avalanche') {
                console.log('✅ Message echoed back from server');
            } else if (msg.type === 'verification_result') {
                console.log('🎉 Verification result received!');
                console.log('Success:', msg.success);
                console.log('Error:', msg.error);
                if (msg.result) {
                    console.log('Result:', JSON.stringify(msg.result, null, 2));
                }
                ws.close();
                process.exit(0);
            }
        } catch (e) {
            console.error('Parse error:', e);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
        console.log('⏰ Test timeout - no response received');
        ws.close();
        process.exit(1);
    }, 30000);
}

testStep4Isolated().catch(console.error);