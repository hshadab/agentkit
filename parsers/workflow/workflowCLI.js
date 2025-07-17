#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import WorkflowManager from '../../circle/workflowManager.js';
import WorkflowExecutor from './workflowExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're using a pre-parsed file or need to parse a command
let workflow = null;
let command = null;

if (process.argv[2] === '--parsed-file' && process.argv[3]) {
    // Load pre-parsed workflow from file
    try {
        const parsedContent = readFileSync(process.argv[3], 'utf-8');
        workflow = JSON.parse(parsedContent);
        command = workflow.description || 'Pre-parsed workflow';
        console.log(`\n🔄 Processing pre-parsed workflow: ${command}\n`);
    } catch (error) {
        console.error('❌ Failed to load parsed workflow file:', error.message);
        process.exit(1);
    }
} else {
    // Parse command normally
    command = process.argv.slice(2).join(' ');
    
    if (!command) {
        console.error('Usage: node workflowCLI_generic.js "command"');
        console.error('   or: node workflowCLI_generic.js --parsed-file <path>');
        console.error('Example: node workflowCLI_generic.js "Generate KYC proof then send 0.01 to alice"');
        process.exit(1);
    }
}

async function runWorkflow() {
    let executor = null;
    
    try {
        // If we don't have a pre-parsed workflow, fail
        if (!workflow) {
            console.error('❌ No pre-parsed workflow provided. OpenAI parsing is required.');
            console.error('All workflows must be parsed with OpenAI before execution.');
            console.error('Please ensure the --parsed-file option is used with a valid parsed workflow file.');
            process.exit(1);
        }
        
        if (workflow.error) {
            console.error(`❌ Parser error: ${workflow.error}`);
            process.exit(1);
        }
        
        console.log(`📋 Parsed workflow with ${workflow.steps.length} steps:`);
        workflow.steps.forEach((step, i) => {
            console.log(`   ${i + 1}. ${step.description}`);
        });
        
        const manager = new WorkflowManager();
        const workflowRecord = manager.createWorkflow(workflow.description, workflow.steps);
        
        console.log(`\n✅ Created workflow: ${workflowRecord.id}`);
        console.log(`🔐 All proofs will use real zkEngine - no simulations\n`);
        
        // Create and connect executor
        executor = new WorkflowExecutor();
        await executor.connect();
        
        // IMPORTANT: Give the WebSocket connection time to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Execute the workflow
        const result = await executor.executeWorkflow(workflow);
        
        // Extract results
        const transferIds = [];
        const proofResults = [];
        
        if (result.stepResults) {
            result.stepResults.forEach(stepResult => {
                if (stepResult.result && stepResult.result.transferId) {
                    transferIds.push(stepResult.result.transferId);
                }
                if (stepResult.result && stepResult.result.proofId) {
                    proofResults.push({
                        type: stepResult.type,
                        proofId: stepResult.result.proofId,
                        status: stepResult.status
                    });
                }
            });
        } else if (result.results) {
            // Handle different result format
            Object.values(result.results).forEach(stepResult => {
                if (stepResult.transferId) {
                    transferIds.push(stepResult.transferId);
                }
                if (stepResult.proofId) {
                    proofResults.push({
                        type: stepResult.type || 'unknown',
                        proofId: stepResult.proofId,
                        status: stepResult.success ? 'completed' : 'failed'
                    });
                }
            });
        }
        
        // Get transfer IDs from result
        if (result.transferIds && result.transferIds.length > 0) {
            transferIds.push(...result.transferIds);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 WORKFLOW SUMMARY');
        console.log('='.repeat(60));
        console.log(`Status: ${result.success ? 'completed' : 'failed'}`);
        console.log(`Workflow ID: ${result.workflowId || workflowRecord.id}`);
        
        if (workflow.steps) {
            const completedSteps = result.stepResults ? 
                result.stepResults.filter(r => r.status === 'completed').length : 
                (result.success ? workflow.steps.length : 0);
            console.log(`Steps Completed: ${completedSteps}/${workflow.steps.length}`);
        }
        
        if (transferIds.length > 0) {
            console.log('\n💸 Transfers:');
            transferIds.forEach(id => {
                console.log(`   Transfer ID: ${id}`);
            });
        }
        
        if (proofResults.length > 0) {
            console.log('\n🔐 zkEngine Proofs (REAL):');
            proofResults.forEach(proof => {
                console.log(`   ${proof.type}: ✅ ${proof.status} (${proof.proofId})`);
            });
        }
        
        if (!result.success && result.error) {
            console.log('\n❌ Error: ' + result.error);
        }
        
        console.log('='.repeat(60));
        
        // Disconnect and exit
        if (executor) {
            executor.disconnect();
        }
        
        // Give time for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        process.exit(result.success ? 0 : 1);
        
    } catch (error) {
        console.error('\n❌ Workflow execution error:', error.message);
        
        if (executor) {
            executor.disconnect();
        }
        
        if (error.message.includes('Cannot find module')) {
            console.error('\n💡 Make sure all required modules are installed:');
            console.error('   npm install');
        } else if (error.message.includes('zkEngine')) {
            console.error('\n💡 Make sure zkEngine binary is available at:');
            console.error('   ~/agentkit/zkengine_binary/zkEngine');
            console.error('   The binary must be executable: chmod +x ~/agentkit/zkengine_binary/zkEngine');
        } else if (error.message.includes('ENOENT') || error.message.includes('spawn')) {
            console.error('\n💡 zkEngine binary not found or not executable');
            console.error('   Check that zkEngine exists and has execute permissions');
        } else if (error.message.includes('timeout')) {
            console.error('\n💡 Proof generation timed out. Check:');
            console.error('   - Rust server is running and responsive');
            console.error('   - workflowExecutor_generic.js has the metadata fix');
            console.error('   - All metadata fields are included (explanation, additional_context)');
        }
        
        process.exit(1);
    }
}

runWorkflow().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
