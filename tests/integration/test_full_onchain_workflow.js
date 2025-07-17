import OnChainAwareWorkflowParser from './parsers/workflow/workflowParser_onchain.js';
import OnChainAwareWorkflowExecutor from './parsers/workflow/workflowExecutor_onchain.js';

async function testWorkflow() {
    const parser = new OnChainAwareWorkflowParser();
    const executor = new OnChainAwareWorkflowExecutor();
    
    const prompt = "Send 0.05 USDC on Solana if Bob is KYC verified on Solana and send 0.03 USDC on Ethereum if Alice is KYC verified on Ethereum.";
    
    console.log("Testing prompt:", prompt);
    console.log("\n=== PARSING ===");
    
    try {
        // Parse the workflow
        const workflow = parser.parseCommand(prompt);
        console.log("\nParsed workflow:");
        console.log(JSON.stringify(workflow, null, 2));
        
        console.log("\n=== EXECUTION ===");
        
        // Connect to WebSocket
        await executor.connect();
        
        // Execute the workflow
        const result = await executor.executeWorkflow(workflow);
        
        console.log("\n=== RESULTS ===");
        console.log("Workflow completed:", result);
        
        // Close connection
        executor.disconnect();
        
    } catch (error) {
        console.error("Error:", error);
        console.error(error.stack);
    }
}

// Run the test
testWorkflow().catch(console.error);