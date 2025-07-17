import WorkflowExecutorFixed from './workflowExecutorFixed.js';

async function test() {
    const executor = new WorkflowExecutorFixed();
    await executor.connect();
    
    // Check WebSocket state
    console.log('WebSocket readyState:', executor.wsClient.readyState);
    console.log('CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');
    
    // Send a test message directly
    const testMsg = {
        message: "Generate KYC proof",
        proof_id: "proof_kyc_direct_" + Date.now(),
        metadata: {
            function: "prove_kyc",
            arguments: ["12345", "1"],
            step_size: 50
        }
    };
    
    console.log('Sending direct test message...');
    executor.wsClient.send(JSON.stringify(testMsg));
    
    // Wait a bit to see if we get a response
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    executor.disconnect();
}

test();
