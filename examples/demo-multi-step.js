#!/usr/bin/env node

console.log('🎯 Multi-Step Workflow UI Demo');
console.log('📊 This will demonstrate workflows with multiple steps\n');

const demos = [
    {
        name: "Demo 1: Three Proofs",
        command: "Generate KYC proof then generate location proof then generate AI content proof",
        steps: 3
    },
    {
        name: "Demo 2: Proof and Verify",
        command: "Generate KYC proof then verify the proof",
        steps: 2
    },
    {
        name: "Demo 3: Conditional Transfer",
        command: "Generate KYC proof then send 0.01 USDC to alice on Ethereum if KYC verified",
        steps: 2
    }
];

import { execSync } from 'child_process';

async function runDemo(demo) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🚀 ${demo.name}`);
    console.log(`📋 Expected steps: ${demo.steps}`);
    console.log(`💬 Command: "${demo.command}"`);
    console.log(`${'='.repeat(70)}\n`);
    
    console.log('⚠️  Watch the UI for:');
    console.log(`   ✓ Single workflow card with ${demo.steps} steps`);
    console.log('   ✓ Each step shows: pending → executing → completed');
    console.log('   ✓ Real zkEngine proofs being generated');
    console.log('   ✓ Smooth transitions between steps\n');
    
    try {
        execSync(`node circle/workflowCLI_generic.js "${demo.command}"`, {
            stdio: 'inherit',
            cwd: '/home/hshadab/agentkit'
        });
        console.log(`\n✅ ${demo.name} completed!\n`);
    } catch (e) {
        console.log(`\n⚠️  ${demo.name} had an issue\n`);
    }
}

async function main() {
    console.log('Starting demos in 3 seconds...\n');
    await new Promise(r => setTimeout(r, 3000));
    
    for (let i = 0; i < demos.length; i++) {
        await runDemo(demos[i]);
        
        if (i < demos.length - 1) {
            console.log('⏳ Next demo in 5 seconds...\n');
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    
    console.log('\n🎉 Demo completed!');
    console.log('\n📋 Summary of UI capabilities demonstrated:');
    console.log('   ✅ Single workflow card per command');
    console.log('   ✅ Multiple steps (2-3) displayed sequentially');
    console.log('   ✅ Real-time status updates for each step');
    console.log('   ✅ Proof generation with real zkEngine');
    console.log('   ✅ Verification results displayed');
    console.log('   ✅ Conditional transfers with status tracking');
}

main();