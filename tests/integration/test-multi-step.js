#!/usr/bin/env node

import { execSync } from 'child_process';

const tests = [
    {
        name: "3-Step Proof Generation",
        command: "Generate KYC proof then generate location proof then generate AI content proof"
    },
    {
        name: "4-Step with Verification",
        command: "Generate KYC proof then verify the proof then generate location proof then verify that proof"
    },
    {
        name: "5-Step Complex Workflow",
        command: "Generate KYC proof then generate location proof then verify the KYC proof then generate AI content proof then verify all proofs"
    },
    {
        name: "Conditional Transfer After Proofs",
        command: "Generate KYC proof then generate location proof then send 0.02 USDC to alice on Ethereum if KYC verified"
    }
];

async function runTest(test) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`📋 Command: ${test.command}`);
    console.log(`${'='.repeat(60)}\n`);
    
    return new Promise((resolve) => {
        try {
            execSync(`node circle/workflowCLI_generic.js "${test.command}"`, {
                stdio: 'inherit',
                cwd: '/home/hshadab/agentkit'
            });
            console.log(`\n✅ ${test.name} completed successfully\n`);
            resolve(true);
        } catch (error) {
            console.error(`\n❌ ${test.name} failed\n`);
            resolve(false);
        }
    });
}

async function main() {
    console.log('🎯 Multi-Step Workflow UI Test');
    console.log('📊 Testing workflows with 3-5 steps each\n');
    
    console.log('⚠️  Check the UI to verify:');
    console.log('   ✓ Each workflow creates ONE card');
    console.log('   ✓ All steps appear in sequence');
    console.log('   ✓ Steps animate: pending → executing → completed');
    console.log('   ✓ No duplicate cards or steps\n');
    
    console.log('Starting in 3 seconds...\n');
    await new Promise(r => setTimeout(r, 3000));
    
    for (const test of tests) {
        await runTest(test);
        
        // Wait between tests
        if (test !== tests[tests.length - 1]) {
            console.log('⏳ Waiting 8 seconds before next test...\n');
            await new Promise(r => setTimeout(r, 8000));
        }
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('📋 Summary:');
    console.log('   - Tested workflows with 3, 4, and 5 steps');
    console.log('   - Tested proof generation, verification, and transfers');
    console.log('   - Check UI to confirm all workflows displayed correctly');
}

main().catch(console.error);