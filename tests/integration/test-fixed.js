import WorkflowExecutorFixed from './workflowExecutorFixed.js';

async function test() {
    const executor = new WorkflowExecutorFixed();
    await executor.connect();
    
    try {
        console.log('📋 Testing proof generation...');
        const result = await executor.generateProof('prove_kyc', ['12345', '1'], 0);
        console.log('✅ Success:', result);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    executor.disconnect();
    process.exit(0);
}

test();
