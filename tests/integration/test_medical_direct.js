// Direct test for medical integrity proof generation
// This bypasses blockchain commitment to test just the proof generation

import WebSocket from 'ws';

async function testMedicalProofDirect() {
    console.log('🏥 Testing Medical Integrity Proof Generation Directly...\n');
    
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('✅ Connected to WebSocket server\n');
        
        // Generate medical proof with simulated data - matching workflowExecutor format
        const proofId = `proof_medical_integrity_${Date.now()}`;
        const proofRequest = {
            content: 'Generate medical_integrity proof',
            proof_id: proofId,
            metadata: {
                function: 'prove_medical_integrity',
                arguments: [
                    '12345',                           // patient_id
                    '123456789',                       // record_hash  
                    String(Math.floor(Date.now() / 1000) - 86400),  // creation_timestamp (1 day ago)
                    String(Math.floor(Date.now() / 1000))    // verification_timestamp (now)
                ],
                step_size: 50,
                explanation: "Zero-knowledge proof generation",
                additional_context: {
                    workflow_id: 'test_medical_direct',
                    step_index: 0,
                    medicalRecordData: {
                        patient_id: '12345',
                        record_hash: '0xabc123def456789',
                        creation_timestamp: Math.floor(Date.now() / 1000) - 86400,
                        commitment_timestamp: Math.floor(Date.now() / 1000) - 86400,
                        status: 'simulated'
                    }
                }
            }
        };
        
        console.log('📤 Sending proof request:', JSON.stringify(proofRequest, null, 2));
        ws.send(JSON.stringify(proofRequest));
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('\n📥 Received message:', message.type);
            
            switch(message.type) {
                case 'proof_status':
                    console.log(`⏳ Status: ${message.status} - ${message.message || ''}`);
                    break;
                    
                case 'proof_complete':
                    console.log('✅ Proof generation complete!');
                    console.log('📊 Metrics:', message.metrics);
                    console.log('🔑 Proof ID:', message.proof_id);
                    
                    // Check if medical data was preserved
                    if (message.metadata?.additional_context?.medicalRecordData) {
                        console.log('✅ Medical record data preserved in proof');
                    } else {
                        console.log('❌ Medical record data NOT found in proof metadata');
                    }
                    
                    ws.close();
                    process.exit(0);
                    break;
                    
                case 'error':
                    console.error('❌ Error:', message.message);
                    ws.close();
                    process.exit(1);
                    break;
                    
                default:
                    console.log('ℹ️  Message:', message);
            }
        } catch (error) {
            console.error('❌ Failed to parse message:', error);
            console.log('Raw data:', data.toString());
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        process.exit(1);
    });
    
    ws.on('close', () => {
        console.log('\n🔌 WebSocket connection closed');
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
        console.error('\n❌ Test timed out after 30 seconds');
        ws.close();
        process.exit(1);
    }, 30000);
}

// Run the test
testMedicalProofDirect().catch(console.error);