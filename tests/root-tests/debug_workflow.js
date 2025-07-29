import WorkflowExecutor from './parsers/workflow/workflowExecutor.js';
import { readFileSync } from 'fs';

async function debugWorkflow() {
    console.log('🔍 Starting debug workflow execution...\n');
    
    // Load a test workflow
    const workflow = {
        description: "Test IoT device workflow",
        workflow_id: "debug_workflow_" + Date.now(),
        steps: [
            {
                type: "register_device",
                device_id: "DEBUG_DEV_001",
                description: "Register test device",
                index: 0
            },
            {
                type: "generate_proof",
                proof_type: "device_proximity",
                device_id: "DEBUG_DEV_001",
                description: "Generate proximity proof",
                index: 1
            }
        ]
    };
    
    const executor = new WorkflowExecutor();
    
    // Add debug logging to WebSocket
    console.log('📡 Connecting to WebSocket...');
    await executor.connect();
    
    // Intercept all WebSocket messages
    const originalOn = executor.wsClient.on.bind(executor.wsClient);
    executor.wsClient.on = function(event, handler) {
        if (event === 'message') {
            const wrappedHandler = (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log(`\n📨 WS Message: ${message.type}`);
                    if (message.type === 'proof_complete') {
                        console.log('  ✅ PROOF_COMPLETE DETAILS:');
                        console.log('    - Proof ID:', message.proof_id);
                        console.log('    - Has proof_data:', !!message.proof_data);
                        console.log('    - Proof data length:', message.proof_data?.length);
                        console.log('    - Has public_inputs:', !!message.public_inputs);
                    }
                } catch (e) {
                    console.log(`📨 WS Raw message: ${data.toString().substring(0, 100)}...`);
                }
                handler(data);
            };
            return originalOn.call(this, event, wrappedHandler);
        }
        return originalOn.call(this, event, handler);
    };
    
    console.log('✅ WebSocket connected and interceptor installed\n');
    
    // Execute only first 2 steps
    console.log('🚀 Executing workflow...\n');
    try {
        const result = await executor.executeWorkflow(workflow, workflow.workflow_id);
        console.log('\n✅ Workflow completed:', result);
    } catch (error) {
        console.error('\n❌ Workflow failed:', error);
    }
    
    // Keep connection alive for a bit to see any delayed messages
    console.log('\n⏳ Waiting 5 seconds for any delayed messages...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    process.exit(0);
}

debugWorkflow().catch(console.error);