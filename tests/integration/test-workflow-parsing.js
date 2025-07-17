#!/usr/bin/env node

import WorkflowParser from './parsers/workflow/workflowParser_final.js';

const parser = new WorkflowParser();

const testCommand = "Generate KYC proof for alice then if KYC verified generate location proof then if location verified send her 0.01 usdc on solana";

console.log("Testing workflow parsing for:");
console.log(testCommand);
console.log("\nParsed steps:");

const result = parser.parseCommand(testCommand);
console.log("Parse result:", JSON.stringify(result, null, 2));

const steps = result.steps || result;
if (Array.isArray(steps)) {
    steps.forEach((step, i) => {
    console.log(`\nStep ${i + 1}:`);
    console.log(`  Type: ${step.type}`);
    console.log(`  Description: ${step.description}`);
    console.log(`  Condition: ${step.condition || 'none'}`);
    if (step.proofType) console.log(`  Proof Type: ${step.proofType}`);
    if (step.amount) console.log(`  Amount: ${step.amount}`);
    if (step.recipient) console.log(`  Recipient: ${step.recipient}`);
    if (step.blockchain) console.log(`  Blockchain: ${step.blockchain}`);
    });
}