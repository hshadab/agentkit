import WorkflowParser from './parsers/workflow/workflowParser_final.js';

const parser = new WorkflowParser();

const testPrompts = [
    "Generate KYC proof for Bob",
    "Generate KYC proof for Bob and verify on Solana",
    "Generate KYC proof for Bob and verify on Solana, then send 0.05 USDC on Solana",
    "Generate KYC proof for Bob, verify it on Solana, then send him 0.05 USDC"
];

testPrompts.forEach(prompt => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
        const result = parser.parseCommand(prompt);
        console.log("\nParsed steps:");
        result.steps.forEach((step, i) => {
            console.log(`\n${i + 1}. ${step.type}`);
            console.log(`   Description: ${step.description}`);
            if (step.person) console.log(`   Person: ${step.person}`);
            if (step.proofType) console.log(`   Proof Type: ${step.proofType}`);
            if (step.recipient) console.log(`   Recipient: ${step.recipient}`);
            if (step.parameters) console.log(`   Parameters:`, step.parameters);
        });
    } catch (error) {
        console.log("Error:", error.message);
    }
});