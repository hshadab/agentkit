import WorkflowExecutor from '../parsers/workflow/workflowExecutor.js';

async function test() {
    console.log('🚀 Starting simple workflow test...');
    
    const executor = new WorkflowExecutor();
    await executor.connect();
    
    // Test just the proof generation method directly
    console.log('📋 Testing proof generation directly...');
    
    try {
        const result = await executor.generateProof('prove_kyc', ['12345', '1'], 0);
        console.log('✅ Proof result:', result);
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    executor.disconnect();
}

test().catch(console.error);
