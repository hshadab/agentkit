// Test medical workflow with debugging
// Run this in the browser console at http://localhost:8001

async function testMedicalWorkflowDebug() {
    console.log('🏥 Testing Medical Workflow with Debug...');
    
    // First, check WebSocket connection
    if (!window.wsManager || !window.wsManager.ws) {
        console.error('❌ WebSocket not connected!');
        return;
    }
    
    console.log('✅ WebSocket connected:', window.wsManager.ws.readyState === 1 ? 'YES' : 'NO');
    
    // Add message listener to see all WebSocket messages
    const originalOnMessage = window.wsManager.ws.onmessage;
    window.wsManager.ws.onmessage = (event) => {
        console.log('📨 WS Message:', JSON.parse(event.data));
        if (originalOnMessage) originalOnMessage.call(window.wsManager.ws, event);
    };
    
    // Create workflow
    const workflow = {
        "id": "medical_test_" + Date.now(),
        "name": "Test Medical Integrity Workflow",
        "description": "Debug medical proof generation",
        "steps": [
            {
                "type": "generate_proof",
                "proof_type": "medical_integrity", 
                "patient_id": "12345",
                "record_hash": "0xabc123def456789",
                "description": "Generate medical integrity proof",
                "index": 0
            }
        ]
    };
    
    console.log('📤 Sending workflow:', workflow);
    
    // Execute workflow
    window.wsManager.send({
        type: 'execute_workflow',
        workflow: workflow
    });
    
    // Set up timeout to check if proof generation starts
    setTimeout(() => {
        console.log('⏱️ Checking proof status after 5 seconds...');
        const proofCards = document.querySelectorAll('.proof-card');
        console.log(`Found ${proofCards.length} proof cards`);
        
        if (proofCards.length === 0) {
            console.error('❌ No proof cards created - proof generation may not have started');
        } else {
            proofCards.forEach(card => {
                const proofId = card.getAttribute('data-proof-id');
                const funcName = card.getAttribute('data-function-name');
                console.log(`📋 Proof card: ${proofId} (${funcName})`);
            });
        }
    }, 5000);
    
    // Also listen for proof complete
    window.addEventListener('message', function proofListener(e) {
        if (e.data && e.data.type === 'proof_complete') {
            console.log('✅ Proof complete:', e.data);
            window.removeEventListener('message', proofListener);
        }
    });
}

// Export function
window.testMedicalWorkflowDebug = testMedicalWorkflowDebug;

console.log(`
=== Medical Workflow Debug Test ===
Run: testMedicalWorkflowDebug()

This will:
1. Check WebSocket connection
2. Log all WebSocket messages
3. Execute a medical integrity proof workflow
4. Monitor for proof card creation
5. Check if proof completes
`);