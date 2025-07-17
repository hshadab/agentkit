import OnChainAwareWorkflowParser from './parsers/workflow/workflowParser_onchain.js';

const parser = new OnChainAwareWorkflowParser();

const prompt = "Send 0.05 USDC on Solana if Bob is KYC verified on Solana and send 0.03 USDC on Ethereum if Alice is KYC verified on Ethereum.";

console.log("Testing prompt:", prompt);

try {
    const workflow = parser.parseCommand(prompt);
    console.log("\nParsed workflow:");
    console.log(JSON.stringify(workflow, null, 2));
    
    console.log("\nAnalysis:");
    if (workflow.steps) {
        workflow.steps.forEach((step, i) => {
            console.log(`\nStep ${i + 1}: ${step.type}`);
            console.log(`  Description: ${step.description}`);
            if (step.verificationType) console.log(`  Verification Type: ${step.verificationType}`);
            if (step.blockchain) console.log(`  Blockchain: ${step.blockchain}`);
            if (step.person) console.log(`  Person: ${step.person}`);
            if (step.amount) console.log(`  Amount: ${step.amount}`);
            if (step.recipient) console.log(`  Recipient: ${step.recipient}`);
            if (step.requiredVerificationBlockchain) console.log(`  Required Verification Blockchain: ${step.requiredVerificationBlockchain}`);
        });
    }
} catch (error) {
    console.error("Error parsing workflow:", error);
    console.error(error.stack);
}