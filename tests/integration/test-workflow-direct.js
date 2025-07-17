import WorkflowExecutor from '../parsers/workflow/workflowExecutor.js';

async function test() {
    console.log('🚀 Starting workflow test...');
    
    const executor = new WorkflowExecutor();
    
    // Add logging to see WebSocket messages
    executor.wsClient = null;
    const originalConnect = executor.connect;
    executor.connect = async function() {
        await originalConnect.call(this);
        console.log('📡 WebSocket connected, adding debug listener...');
        
        this.wsClient.on('message', (data) => {
            console.log('📨 WS Message:', data.toString().substring(0, 200) + '...');
        });
    };
    
    await executor.connect();
    
    const workflow = {
        steps: [{
            type: 'kyc_proof',
            description: 'Generate KYC compliance proof'
        }],
        description: 'Test workflow'
    };
    
    console.log('📋 Executing workflow...');
    const result = await executor.executeWorkflow(workflow);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
    
    executor.disconnect();
}

test().catch(console.error);
