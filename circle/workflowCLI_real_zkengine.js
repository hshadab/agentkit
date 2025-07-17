#!/usr/bin/env node

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import WorkflowManager from './workflowManager.js';
import WorkflowExecutor from '../parsers/workflow/workflowExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const command = process.argv.slice(2).join(' ');
    
    if (!command) {
        console.error('❌ No command provided');
        process.exit(1);
    }

    try {
        console.log(`🚀 Processing workflow command: ${command}`);
        
        // Force real zkEngine mode
        process.env.USE_REAL_ZKENGINE = 'true';
        process.env.ZKENGINE_MODE = 'real';
        // Real zkEngine is now the default - no flags needed
        
        console.log(`🔧 zkEngine Mode: ${process.env.ZKENGINE_MODE}`);
        console.log(`⚙️ Real zkEngine: ${process.env.USE_REAL_ZKENGINE}`);
        
        // Parse the workflow
        console.log('📝 Parsing workflow...');
        const parserOutput = execSync(`node workflowParser_generic_final.js "${command}"`, { encoding: 'utf8' });
        const workflow = JSON.parse(parserOutput);
        
        if (!workflow.steps || workflow.steps.length === 0) {
            throw new Error('No valid steps found in workflow');
        }
        
        console.log(`✅ Parsed ${workflow.steps.length} steps`);
        console.log(`🔬 Real verification required: ${workflow.requiresRealVerification}`);
        console.log(`⚙️ zkEngine mode: ${workflow.zkEngineMode}`);
        
        // Display parsed steps
        console.log('\n📋 Workflow Steps:');
        workflow.steps.forEach((step, i) => {
            console.log(`  ${i + 1}. ${step.type}: ${step.description}`);
            if (step.useRealZkEngine) console.log(`     🔧 Uses real zkEngine`);
            if (step.zkEngineRequired) console.log(`     ✅ Real verification required`);
        });
        
        // Create workflow manager and executor
        console.log('\n🏗️ Creating workflow manager...');
        const manager = new WorkflowManager();
        const workflowRecord = manager.createWorkflow(workflow.description, workflow.steps);
        
        console.log(`📋 Created workflow: ${workflowRecord.id}`);
        
        // Execute workflow with real zkEngine
        console.log('\n🚀 Starting workflow execution with real zkEngine...');
        const executor = new WorkflowExecutor(manager);
        const result = await executor.executeWorkflow(workflowRecord.id);
        
        console.log('\n🎉 Workflow execution completed!');
        console.log('📊 Final Results:');
        console.log(JSON.stringify(result, null, 2));
        
        // Extract and display key information
        if (result.results) {
            console.log('\n📈 Step-by-Step Results:');
            Object.entries(result.results).forEach(([stepKey, stepResult]) => {
                console.log(`  ${stepKey}: ${stepResult.status || stepResult.result || 'completed'}`);
                if (stepResult.proofId) console.log(`    🔐 Proof ID: ${stepResult.proofId}`);
                if (stepResult.transferId) console.log(`    💸 Transfer ID: ${stepResult.transferId}`);
            });
        }
        
    } catch (error) {
        console.error('💥 Workflow execution failed:', error.message);
        if (error.stdout) console.log('stdout:', error.stdout);
        if (error.stderr) console.log('stderr:', error.stderr);
        process.exit(1);
    }
}

main().catch(console.error);
