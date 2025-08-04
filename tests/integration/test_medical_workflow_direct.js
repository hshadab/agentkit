// Direct test for medical workflow
import WebSocket from 'ws';
import fs from 'fs';

async function testMedicalWorkflow() {
    console.log('🏥 Testing medical workflow directly...');
    
    // Create WebSocket connection
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Send workflow command
        const message = {
            message: 'Create medical record for patient 12345 and verify integrity',
            type: 'chat'
        };
        
        console.log('📤 Sending workflow command...');
        ws.send(JSON.stringify(message));
    });
    
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            console.log(`📨 Message type: ${msg.type}`);
            
            // Log important messages
            if (msg.type === 'workflow_step_update') {
                console.log(`   Step ${msg.stepIndex}: ${msg.status} - ${msg.description}`);
            } else if (msg.type === 'verify_on_avalanche') {
                console.log('   🔐 Verify on Avalanche message sent!');
                console.log('   Request ID:', msg.requestId);
                console.log('   Proof Type:', msg.proofType);
            } else if (msg.type === 'commit_result') {
                console.log('   ✅ Avalanche commit successful:', msg.transactionHash);
            } else if (msg.type === 'proof_complete') {
                console.log('   ✅ Proof generated:', msg.proofId);
            } else if (msg.type === 'workflow_completed' || msg.error) {
                console.log('   📋 Workflow result:', JSON.stringify(msg, null, 2));
                
                // Close connection after completion
                setTimeout(() => {
                    ws.close();
                    process.exit(0);
                }, 1000);
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });
    
    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
}

// Run the test
testMedicalWorkflow().catch(console.error);