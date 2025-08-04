// Test AI workflow
import WebSocket from 'ws';

async function testAIWorkflow() {
    console.log('🤖 Testing AI workflow...');
    
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.on('open', () => {
        console.log('✅ Connected');
        
        // Test AI workflow - should be simple 2-step
        const message = {
            message: 'Generate AI content proof and verify on Avalanche',
            type: 'chat'
        };
        
        console.log('📤 Sending:', message.message);
        ws.send(JSON.stringify(message));
    });
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log(`📨 ${msg.type}`);
        
        if (msg.type === 'workflow_step_update') {
            console.log(`   Step ${msg.stepIndex}: ${msg.status} - ${msg.description || msg.stepId}`);
        } else if (msg.type === 'verify_on_avalanche') {
            console.log('   🔐 Avalanche verification requested!');
        } else if (msg.type === 'proof_complete') {
            console.log('   ✅ Proof generated:', msg.proof_id);
        } else if (msg.type === 'workflow_completed' || msg.error) {
            console.log('   Result:', msg.success ? 'SUCCESS' : 'FAILED');
            ws.close();
            process.exit(0);
        }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
        console.log('⏰ Test timeout');
        ws.close();
        process.exit(1);
    }, 30000);
}

testAIWorkflow().catch(console.error);