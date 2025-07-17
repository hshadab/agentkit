#!/usr/bin/env node

import WorkflowParser from './parsers/workflow/workflowParser_final.js';

const parser = new WorkflowParser();

// Test the problematic workflow
const testWorkflow = "Generate KYC proof for alice then if KYC verified generate location proof then if location verified send her 0.01 usdc on solana";

console.log("Testing workflow parsing for conditional statements");
console.log("=" .repeat(80));
console.log("\nWorkflow:", testWorkflow);
console.log("\nExpected steps:");
console.log("1. Generate KYC proof");
console.log("2. If KYC verified -> Generate location proof");  
console.log("3. If location verified -> Send 0.01 USDC to alice on solana");

const result = parser.parseCommand(testWorkflow);

console.log("\nActual parsed result:");
console.log(JSON.stringify(result, null, 2));

console.log("\n\nISSUES FOUND:");
result.steps.forEach((step, i) => {
    console.log(`\nStep ${i + 1}: ${step.description}`);
    console.log(`  Raw text: "${step.raw}"`);
    console.log(`  Type: ${step.type}`);
    
    if (i === 1 && step.type === 'kyc_proof') {
        console.log("  ❌ ERROR: This should be a location proof with condition, not another KYC proof!");
        console.log("  The parser is not handling 'if KYC verified generate location proof' correctly");
    }
});

console.log("\n\nROOT CAUSE:");
console.log("The parser splits by 'then' but doesn't properly extract conditions from steps like:");
console.log("'if KYC verified generate location proof'");
console.log("\nIt should:");
console.log("1. Extract the condition: 'if KYC verified'");
console.log("2. Parse the action: 'generate location proof'");
console.log("3. Store the condition with the step for the executor to check");