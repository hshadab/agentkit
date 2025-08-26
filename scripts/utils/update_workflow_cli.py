#!/usr/bin/env python3

import os

cli_code = """#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const { WorkflowManager } = require('./workflowManager');
const { WorkflowExecutor } = require('./workflowExecutor_generic');

const command = process.argv.slice(2).join(' ');

if (!command) {
    console.error('Usage: node workflowCLI_generic.js "command"');
    console.error('Example: node workflowCLI_generic.js "Generate KYC proof then send 0.01 to alice"');
    process.exit(1);
}

async function runWorkflow() {
    try {
        console.log(`\\n🔄 Processing workflow with REAL zkEngine: ${command}\\n`);
        
        const parserPath = path.join(__dirname, 'workflowParser_generic_final.js');
        const parserOutput = execSync(`node "${parserPath}" "${command}"`, { encoding: 'utf-8' });
        
        const workflow = JSON.parse(parserOutput);
        
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
        
        console.log(`\\n✅ Created workflow: ${workflowRecord.id}`);
        console.log(`🔐 All proofs will use real zkEngine - no simulations\\n`);
        
        const executor = new WorkflowExecutor(manager);
        const result = await executor.executeWorkflow(workflowRecord.id);
        
        const transferIds = [];
        Object.values(result.results || {}).forEach(stepResult => {
            if (stepResult.transferId) {
                transferIds.push(stepResult.transferId);
            }
        });
        
        console.log('\\n' + '='.repeat(60));
        console.log('📊 WORKFLOW SUMMARY');
        console.log('='.repeat(60));
        console.log(`Status: ${result.status || (result.success ? 'completed' : 'failed')}`);
        console.log(`Steps Completed: ${result.stepsCompleted}/${workflow.steps.length}`);
        
        if (transferIds.length > 0) {
            console.log('\\n💸 Transfers:');
            transferIds.forEach(id => {
                console.log(`   Transfer ID: ${id}`);
            });
        }
        
        const proofResults = Object.entries(result.results || {}).filter(([_, r]) => r.proofId);
        if (proofResults.length > 0) {
            console.log('\\n🔐 zkEngine Proofs (REAL):');
            proofResults.forEach(([_, result]) => {
                if (result.proofId) {
                    const status = result.verified ? 'verified' : (result.success ? 'generated' : 'failed');
                    console.log(`   ${result.proofType || 'proof'}: ${result.proofId} (${status})`);
                }
            });
        }
        
        const failedSteps = Object.entries(result.results || {}).filter(([_, r]) => !r.success && !r.skipped);
        if (failedSteps.length > 0) {
            console.log('\\n❌ Failed Steps:');
            failedSteps.forEach(([step, result]) => {
                console.log(`   ${step}: ${result.error}`);
            });
        }
        
        console.log('='.repeat(60));
        
        process.exit(result.success ? 0 : 1);
        
    } catch (error) {
        console.error('\\n❌ Workflow execution error:', error.message);
        
        if (error.message.includes('Cannot find module')) {
            console.error('\\n💡 Make sure all required modules are installed:');
            console.error('   npm install');
        } else if (error.message.includes('zkEngine')) {
            console.error('\\n💡 Make sure zkEngine binary is available at:');
            console.error('   ~/agentkit/zkengine_binary/zkEngine');
            console.error('   The binary must be executable: chmod +x ~/agentkit/zkengine_binary/zkEngine');
        } else if (error.message.includes('ENOENT') || error.message.includes('spawn')) {
            console.error('\\n💡 zkEngine binary not found or not executable');
            console.error('   Check that zkEngine exists and has execute permissions');
        }
        
        process.exit(1);
    }
}

runWorkflow();"""

# Backup and update
backup_path = os.path.expanduser("~/agentkit/circle/workflowCLI_generic.js.backup")
cli_path = os.path.expanduser("~/agentkit/circle/workflowCLI_generic.js")

if os.path.exists(cli_path):
    with open(cli_path, 'r') as f:
        with open(backup_path, 'w') as backup:
            backup.write(f.read())
    print(f"✅ Backed up current CLI to {backup_path}")

with open(cli_path, 'w') as f:
    f.write(cli_code)

# Make it executable
os.chmod(cli_path, 0o755)

print("✅ Updated workflowCLI_generic.js - no simulation flags needed")
