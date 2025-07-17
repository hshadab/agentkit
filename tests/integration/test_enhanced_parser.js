import EnhancedWorkflowParser from './parsers/workflow/workflowParser_enhanced.js';

const parser = new EnhancedWorkflowParser();

const testPrompts = [
    "Generate KYC proof for Bob",
    "Generate KYC proof for Bob and verify on Solana",
    "Generate KYC proof for Bob and verify on Solana, then send 0.05 USDC on Solana",
    "Generate KYC proof for Bob, verify it on Solana, then send him 0.05 USDC",
    "Generate KYC proof for Bob and verify on Solana, then send him 0.05 USDC on Solana",
    "Send 0.05 USDC on Solana if Bob is KYC verified on Solana"
];

testPrompts.forEach(prompt => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`${'='.repeat(70)}`);
    
    try {
        const result = parser.parseCommand(prompt);
        console.log("\nParsed workflow:");
        console.log(`  Description: ${result.description}`);
        console.log(`  Requires Proofs: ${result.requiresProofs}`);
        console.log(`  Steps: ${result.steps.length}`);
        
        result.steps.forEach((step, i) => {
            console.log(`\n  Step ${i + 1}: ${step.type}`);
            console.log(`    Description: ${step.description}`);
            if (step.person) console.log(`    Person: ${step.person}`);
            if (step.proofType) console.log(`    Proof Type: ${step.proofType}`);
            if (step.recipient) console.log(`    Recipient: ${step.recipient}`);
            if (step.amount) console.log(`    Amount: ${step.amount}`);
            if (step.blockchain) console.log(`    Blockchain: ${step.blockchain}`);
            if (step.verificationType) console.log(`    Verification Type: ${step.verificationType}`);
        });
    } catch (error) {
        console.log("Error:", error.message);
        console.log(error.stack);
    }
});