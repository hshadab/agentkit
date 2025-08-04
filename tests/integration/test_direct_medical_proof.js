// Direct test of medical proof generation
// Run this in browser console at http://localhost:8001

async function testDirectMedicalProof() {
    console.log('🔬 Testing direct medical proof generation...');
    
    if (!window.wsManager) {
        console.error('WebSocket manager not available');
        return;
    }
    
    const proofId = `proof_medical_integrity_${Date.now()}`;
    const metadata = {
        function: 'prove_medical_integrity',
        arguments: ['12345', '123456789', '1753754708', '1753841108'],
        step_size: 16,
        explanation: 'Testing medical integrity proof'
    };
    
    console.log('📤 Sending proof request:', { proofId, metadata });
    
    // Listen for responses
    const messageHandler = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 Received:', data.type, data);
        
        if (data.proof_id === proofId) {
            if (data.type === 'proof_status' && data.status === 'generating') {
                console.log('✅ Proof generation started!');
            } else if (data.type === 'proof_complete') {
                console.log('✅ Proof completed!');
                window.wsManager.ws.removeEventListener('message', messageHandler);
            } else if (data.type === 'proof_error') {
                console.error('❌ Proof error:', data.error);
                window.wsManager.ws.removeEventListener('message', messageHandler);
            }
        }
    };
    
    window.wsManager.ws.addEventListener('message', messageHandler);
    
    // Send the proof generation request
    window.wsManager.send({
        content: `Generate medical integrity proof`,
        proof_id: proofId,
        metadata: metadata
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
        console.log('⏱️ Timeout - removing listener');
        window.wsManager.ws.removeEventListener('message', messageHandler);
    }, 30000);
}

window.testDirectMedicalProof = testDirectMedicalProof;

console.log(`
=== Direct Medical Proof Test ===
Run: testDirectMedicalProof()

This will send a direct proof generation request and monitor responses.
`);