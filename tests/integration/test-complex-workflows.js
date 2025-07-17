#!/usr/bin/env node

import { spawn } from 'child_process';

// Test complex multi-proof workflows
const workflows = [
    {
        name: "Multi-Proof Workflow",
        command: "Generate KYC proof then generate location proof then generate AI content proof"
    },
    {
        name: "Proof and Verification Chain",
        command: "Generate KYC proof then verify the proof then generate location proof then verify that proof"
    },
    {
        name: "Complex Conditional Transfer",
        command: "Generate KYC proof then generate location proof then send 0.05 USDC to alice on Ethereum if KYC verified and location verified"
    },
    {
        name: "Multi-Step Verification Workflow",
        command: "Generate AI content proof with hash 12345 then verify the proof then generate KYC proof then generate location proof at 40.7128,-74.0060 then verify all proofs"
    },
    {
        name: "Sequential Proof Dependencies",
        command: "Generate KYC proof then if KYC verified generate location proof then if location verified generate AI content proof then if all verified send 0.02 USDC to bob on Ethereum"
    }
];

async function runWorkflow(workflow) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🚀 Testing: ${workflow.name}`);
    console.log(`📋 Command: ${workflow.command}`);
    console.log(`${'='.repeat(80)}\n`);

    return new Promise((resolve) => {
        const child = spawn('node', ['circle/workflowCLI_generic.js', workflow.command], {
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            console.log(`\n✅ Workflow "${workflow.name}" completed with code ${code}\n`);
            resolve(code);
        });

        child.on('error', (error) => {
            console.error(`❌ Error running workflow: ${error}`);
            resolve(1);
        });
    });
}

async function testAllWorkflows() {
    console.log('🧪 Starting Complex Workflow Tests');
    console.log('📊 Testing multi-proof generation, verification chains, and conditional logic\n');
    
    console.log('⚠️  IMPORTANT: Check the UI to verify:');
    console.log('   1. Each workflow creates a single card');
    console.log('   2. All steps are displayed sequentially');
    console.log('   3. Steps transition: pending → executing → completed');
    console.log('   4. Proof results are shown for each step');
    console.log('   5. Verification results display correctly\n');
    
    // Add delay to let user prepare
    console.log('Starting tests in 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    for (const workflow of workflows) {
        await runWorkflow(workflow);
        
        // Wait between workflows to observe UI updates
        if (workflow !== workflows[workflows.length - 1]) {
            console.log('⏳ Waiting 10 seconds before next workflow...\n');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    
    console.log('\n🎉 All workflow tests completed!');
    console.log('📋 Please check the UI to verify all workflows displayed correctly.');
}

// Run tests
testAllWorkflows().catch(console.error);