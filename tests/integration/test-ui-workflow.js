#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🧪 Testing UI Workflow Display');
console.log('📊 This test will create a workflow with 5 steps\n');

const command = "Generate KYC proof then generate location proof at 40.7128,-74.0060 then generate AI content proof with hash 999888 then verify the KYC proof then send 0.03 USDC to alice on Ethereum if all proofs verified";

console.log('📋 Command:', command);
console.log('\n⚠️  Watch the UI to verify:');
console.log('   ✓ Single workflow card appears');
console.log('   ✓ 5 steps are listed');
console.log('   ✓ Each step transitions: pending → executing → completed');
console.log('   ✓ Proof IDs appear after generation');
console.log('   ✓ Verification results show');
console.log('   ✓ Transfer status appears at the end\n');

console.log('Starting in 3 seconds...\n');

setTimeout(() => {
    try {
        execSync(`node circle/workflowCLI_generic.js "${command}"`, {
            stdio: 'inherit',
            cwd: '/home/hshadab/agentkit'
        });
        
        console.log('\n✅ Workflow test completed!');
        console.log('📋 Check the UI to confirm all 5 steps displayed correctly.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}, 3000);